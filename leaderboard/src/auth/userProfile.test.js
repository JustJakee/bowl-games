import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setUserProfileDataClientForTests,
  getCurrentUserProfile,
  updateCurrentUserFavoriteTeam,
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
