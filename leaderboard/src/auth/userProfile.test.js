import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setUserProfileDataClientForTests,
  getCurrentUserProfile,
  updateCurrentUserFavoriteTeam,
} from "./userProfile.js";
import { profileBelongsToOwner } from "./UserProfileContext.jsx";

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
