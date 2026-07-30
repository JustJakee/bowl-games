import assert from "node:assert/strict";
import test from "node:test";
import {
  __setLeaderboardRepositoryDataClientForTests,
  loadSeasonLeaderboardData,
} from "./leaderboardRepository.js";

test("leaderboard lists every page without selecting protected entry owner data", async () => {
  const entryCalls = [];
  const pickCalls = [];
  const client = {
    models: {
      Entry: {
        list: async (input) => {
          entryCalls.push(input);

          if (!input.nextToken) {
            return {
              data: [
                {
                  id: "entry-1",
                  seasonId: "season-1",
                  entryName: "First Entry",
                  tieBreakerValue: 50,
                  isDeleted: false,
                  userProfile: { username: "First Player" },
                },
                null,
              ],
              nextToken: "entries-page-2",
            };
          }

          return {
            data: [
              {
                id: "entry-2",
                seasonId: "season-1",
                entryName: "Second Entry",
                tieBreakerValue: 51,
                isDeleted: false,
                userProfile: { username: "Second Player" },
              },
            ],
            nextToken: null,
          };
        },
      },
      Pick: {
        list: async (input) => {
          pickCalls.push(input);

          if (!input.nextToken) {
            return {
              data: [
                {
                  id: "pick-1",
                  seasonId: "season-1",
                  entryId: "entry-1",
                  gameId: "game-1",
                  selectedTeam: "AAA",
                },
              ],
              nextToken: "picks-page-2",
            };
          }

          return {
            data: [
              {
                id: "pick-2",
                seasonId: "season-1",
                entryId: "entry-2",
                gameId: "game-1",
                selectedTeam: "BBB",
              },
            ],
          };
        },
      },
      UserProfile: {
        list: async () => {
          throw new Error("The public leaderboard should not scan profiles.");
        },
      },
    },
  };

  __setLeaderboardRepositoryDataClientForTests(client);

  try {
    const result = await loadSeasonLeaderboardData({ seasonId: "season-1" });

    assert.deepEqual(
      result.entries.map((entry) => entry.id),
      ["entry-1", "entry-2"],
    );
    assert.deepEqual(
      result.picks.map((pick) => pick.id),
      ["pick-1", "pick-2"],
    );
    assert.deepEqual(result.usernamesByOwner, {});

    assert.equal(entryCalls.length, 2);
    assert.equal(pickCalls.length, 2);
    assert.deepEqual(
      entryCalls.map((call) => call.nextToken),
      [undefined, "entries-page-2"],
    );
    assert.deepEqual(
      pickCalls.map((call) => call.nextToken),
      [undefined, "picks-page-2"],
    );

    for (const call of entryCalls) {
      assert.equal(call.limit, 100);
      assert.equal(call.authMode, "userPool");
      assert.equal(call.selectionSet.includes("owner"), false);
      assert.equal(call.selectionSet.includes("userProfileId"), false);
      assert.equal(call.selectionSet.includes("userProfile.username"), true);
      assert.deepEqual(call.filter, {
        seasonId: { eq: "season-1" },
      });
    }

    for (const call of pickCalls) {
      assert.equal(call.limit, 100);
      assert.equal(call.authMode, "userPool");
      assert.equal(call.selectionSet.includes("owner"), false);
      assert.deepEqual(call.filter, {
        seasonId: { eq: "season-1" },
      });
    }
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});

test("leaderboard rejects a partial page with GraphQL errors", async () => {
  const client = {
    models: {
      Entry: {
        list: async () => ({
          data: [
            {
              id: "partial-entry",
              seasonId: "season-1",
              entryName: "Partial Entry",
              isDeleted: false,
            },
          ],
          errors: [{ message: "Unexpected leaderboard authorization error." }],
        }),
      },
      Pick: {
        list: async () => ({ data: [] }),
      },
    },
  };

  __setLeaderboardRepositoryDataClientForTests(client);

  try {
    await assert.rejects(
      loadSeasonLeaderboardData({ seasonId: "season-1" }),
      /Unexpected leaderboard authorization error/,
    );
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});

test("leaderboard returns only the canonical entry and picks for each player", async () => {
  const profile = { id: "profile-1", username: "Legacy Player" };
  const client = {
    models: {
      Entry: {
        list: async () => ({
          data: [
            {
              id: "old-entry",
              seasonId: "season-1",
              entryName: "Old",
              isDeleted: false,
              userProfile: profile,
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "canonical-entry",
              seasonId: "season-1",
              entryName: "Current",
              isDeleted: false,
              userProfile: profile,
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        }),
      },
      Pick: {
        list: async () => ({
          data: [
            {
              id: "old-pick",
              seasonId: "season-1",
              entryId: "old-entry",
              gameId: "game-1",
              selectedTeam: "AAA",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "canonical-pick",
              seasonId: "season-1",
              entryId: "canonical-entry",
              gameId: "game-1",
              selectedTeam: "BBB",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
        }),
      },
    },
  };

  __setLeaderboardRepositoryDataClientForTests(client);

  try {
    const result = await loadSeasonLeaderboardData({ seasonId: "season-1" });
    assert.deepEqual(result.entries.map(({ id }) => id), ["canonical-entry"]);
    assert.deepEqual(result.picks.map(({ id }) => id), ["canonical-pick"]);
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});
