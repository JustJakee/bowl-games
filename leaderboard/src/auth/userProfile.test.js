import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setUserProfileDataClientForTests,
  createCurrentUserProfileWithFavoriteTeam,
  evaluateUsernameRequirements,
  getCurrentUserProfile,
  isUsernameTaken,
  updateCurrentUserFavoriteTeam,
  validateUsername,
} from "./userProfile.js";
import {
  applySavedFavoriteTeamToState,
  mergePersistedFavoriteTeamProfile,
  profileBelongsToOwner,
} from "./UserProfileContext.jsx";

afterEach(() => {
  __setUserProfileDataClientForTests(null);
});

test("saved favorite team is restored with the owner profile", async () => {
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        userProfileByOwner: async ({ owner }) => ({
          data: [{ id: "profile-1", owner, favoriteTeamId: "333" }],
        }),
      },
    },
  });

  const profile = await getCurrentUserProfile("owner-1");
  assert.equal(profile.favoriteTeamId, "333");
  assert.equal(profileBelongsToOwner(profile, "owner-1"), true);
  assert.equal(profileBelongsToOwner(profile, "owner-2"), false);
});

test("favorite team update sends only profile ID and stable team ID", async () => {
  const calls = [];
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        update: async (...args) => {
          calls.push(args);
          return {
            data: {
              id: "profile-1",
              owner: "owner-1",
              favoriteTeamId: "333",
            },
          };
        },
      },
    },
  });

  const result = await updateCurrentUserFavoriteTeam({
    profileId: "profile-1",
    favoriteTeamId: 333,
  });
  assert.deepEqual(calls[0][0], {
    id: "profile-1",
    favoriteTeamId: "333",
  });
  assert.equal(calls[0][1].authMode, "userPool");
  assert.equal(result.favoriteTeamId, "333");
});

test("unauthorized and failed preference writes are rejected", async () => {
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        update: async () => ({
          data: null,
          errors: [{ message: "Not authorized to access UserProfile" }],
        }),
      },
    },
  });

  await assert.rejects(
    updateCurrentUserFavoriteTeam({
      profileId: "someone-elses-profile",
      favoriteTeamId: "12",
    }),
    /Not authorized/,
  );
});

test("a confirmed favorite team write immediately publishes the requested team ID", () => {
  const current = {
    status: "ready",
    profile: {
      id: "profile-1",
      owner: "owner-1",
      favoriteTeamId: "12",
    },
    error: "",
  };

  const next = applySavedFavoriteTeamToState(
    current,
    "owner-1",
    { id: "profile-1", owner: "owner-1" },
    333,
  );

  assert.notEqual(next, current);
  assert.equal(next.profile.favoriteTeamId, "333");
  assert.equal(current.profile.favoriteTeamId, "12");
});

test("favorite team state cannot leak across account changes", () => {
  const current = {
    status: "ready",
    profile: {
      id: "profile-2",
      owner: "owner-2",
      favoriteTeamId: "12",
    },
    error: "",
  };

  assert.equal(
    applySavedFavoriteTeamToState(
      current,
      "owner-1",
      { id: "profile-1", owner: "owner-1", favoriteTeamId: "333" },
      "333",
    ),
    current,
  );
});

test("failed writes leave the previously saved favorite team unchanged", async () => {
  const previous = {
    id: "profile-1",
    owner: "owner-1",
    favoriteTeamId: "12",
  };

  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        update: async () => ({
          data: null,
          errors: [{ message: "Preference update failed" }],
        }),
      },
    },
  });

  await assert.rejects(
    updateCurrentUserFavoriteTeam({
      profileId: previous.id,
      favoriteTeamId: "333",
    }),
    /Preference update failed/,
  );
  assert.equal(previous.favoriteTeamId, "12");
});

test("the persisted ID wins when a mutation response omits the optional field", () => {
  const merged = mergePersistedFavoriteTeamProfile(
    { id: "profile-1", owner: "owner-1", favoriteTeamId: "12" },
    { id: "profile-1", owner: "owner-1" },
    "333",
  );

  assert.equal(merged.favoriteTeamId, "333");
});

test("username requirements and submission validation share the existing rules", () => {
  assert.deepEqual(
    evaluateUsernameRequirements("Bowl-Fan_26").map(({ id, satisfied }) => [
      id,
      satisfied,
    ]),
    [
      ["no-spaces", true],
      ["length", true],
      ["allowed-characters", true],
    ],
  );
  assert.equal(
    validateUsername("ab"),
    "Username must be between 3 and 20 characters.",
  );
  assert.equal(validateUsername("Bowl Fan"), "Username cannot contain spaces.");
  assert.equal(
    validateUsername("Bowl.Fan"),
    "Use only letters, numbers, underscores, and hyphens.",
  );
  assert.equal(validateUsername("Bowl-Fan_26"), null);
});

test("username uniqueness continues to use the normalized lookup", async () => {
  const calls = [];
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        userProfileByUsernameKey: async (...args) => {
          calls.push(args);
          return { data: [{ username: "BowlFan", usernameKey: "bowlfan" }] };
        },
      },
    },
  });

  assert.equal(await isUsernameTaken("bowlfan"), true);
  assert.deepEqual(calls[0][0], { usernameKey: "bowlfan" });
  assert.equal(calls[0][1].authMode, "userPool");
});

test("profile creation may skip the optional favorite team", async () => {
  let updates = 0;
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        create: async ({ email, username, usernameKey }) => ({
          data: {
            id: "profile-1",
            owner: "owner-1",
            email,
            username,
            usernameKey,
          },
        }),
        update: async () => {
          updates += 1;
          return { data: null };
        },
      },
    },
  });

  const result = await createCurrentUserProfileWithFavoriteTeam({
    email: "fan@example.com",
    username: "BowlFan",
  });
  assert.equal(result.profile.username, "BowlFan");
  assert.equal(result.favoriteTeamError, null);
  assert.equal(updates, 0);
});

test("favorite team persists after profile creation without a second create", async () => {
  let creates = 0;
  const writes = [];
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        create: async (input) => {
          creates += 1;
          writes.push(input);
          return {
            data: { id: "profile-1", owner: "owner-1", ...input },
          };
        },
        update: async (input) => {
          writes.push(input);
          return {
            data: { id: "profile-1", owner: "owner-1", ...input },
          };
        },
      },
    },
  });

  const result = await createCurrentUserProfileWithFavoriteTeam({
    email: "fan@example.com",
    favoriteTeamId: "333",
    preferredGroup: "player",
    username: "BowlFan",
  });

  assert.equal(creates, 1);
  assert.equal("favoriteTeamId" in writes[0], false);
  assert.deepEqual(writes[1], { id: "profile-1", favoriteTeamId: "333" });
  assert.equal(result.profile.favoriteTeamId, "333");
  assert.equal(result.favoriteTeamError, null);
});

test("an optional team failure preserves the created profile without recreating it", async () => {
  let creates = 0;
  __setUserProfileDataClientForTests({
    models: {
      UserProfile: {
        create: async (input) => {
          creates += 1;
          return {
            data: { id: "profile-1", owner: "owner-1", ...input },
          };
        },
        update: async () => ({
          data: null,
          errors: [{ message: "Team preference unavailable" }],
        }),
      },
    },
  });

  const result = await createCurrentUserProfileWithFavoriteTeam({
    email: "fan@example.com",
    favoriteTeamId: "333",
    username: "BowlFan",
  });

  assert.equal(creates, 1);
  assert.equal(result.profile.id, "profile-1");
  assert.match(result.favoriteTeamError.message, /Team preference unavailable/);
});
