import assert from "node:assert/strict";
import test from "node:test";
import {
  __setLeaderboardRepositoryDataClientForTests,
  loadSeasonLeaderboardData,
} from "./leaderboardRepository.js";

const entry = (id, profileId = id) => ({
  id,
  seasonId: "season-1",
  entryName: id,
  isDeleted: false,
  userProfile: { id: profileId, username: `Player ${profileId}` },
});
const pick = (id, entryId) => ({
  id,
  seasonId: "season-1",
  entryId,
  gameId: "game-1",
  selectedTeam: "AAA",
});

test("leaderboard pages public Entries and obtains picks only from the guarded query", async () => {
  const entryCalls = [];
  const visibleCalls = [];
  const client = {
    models: {
      Entry: {
        list: async (input) => {
          entryCalls.push(input);
          return input.nextToken
            ? { data: [entry("e2")], nextToken: null }
            : { data: [entry("e1"), null], nextToken: "page-2" };
        },
      },
      Pick: {
        list: () => {
          throw new Error("Raw Pick list must not be called.");
        },
      },
    },
    queries: {
      visibleSeasonPicks: async (...args) => {
        visibleCalls.push(args);
        return {
          data: {
            picks: [pick("p1", "e1"), pick("p2", "e2")],
            completeEntryIds: ["e1", "e2"],
            tieBreakers: [{ entryId: "e1", value: 42 }],
          },
        };
      },
    },
  };
  __setLeaderboardRepositoryDataClientForTests(client);
  try {
    const result = await loadSeasonLeaderboardData({ seasonId: "season-1" });
    assert.deepEqual(
      result.entries.map(({ id }) => id),
      ["e1", "e2"],
    );
    assert.deepEqual(
      result.picks.map(({ id }) => id),
      ["p1", "p2"],
    );
    assert.deepEqual(result.completeEntryIds, ["e1", "e2"]);
    assert.equal(result.entries[0].tieBreakerValue, 42);
    assert.equal(result.entries[1].tieBreakerValue, null);
    assert.deepEqual(
      entryCalls.map(({ nextToken }) => nextToken),
      [undefined, "page-2"],
    );
    assert.equal(
      entryCalls.every(
        (call) =>
          !call.selectionSet.includes("owner") &&
          !call.selectionSet.includes("tieBreakerValue"),
      ),
      true,
    );
    assert.deepEqual(visibleCalls, [
      [{ seasonId: "season-1" }, { authMode: "userPool" }],
    ]);
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});

test("leaderboard refuses a partial guarded response", async () => {
  __setLeaderboardRepositoryDataClientForTests({
    models: { Entry: { list: async () => ({ data: [entry("e1")] }) } },
    queries: {
      visibleSeasonPicks: async () => ({
        data: { picks: [pick("p1", "e1")] },
        errors: [{ message: "Not authorized." }],
      }),
    },
  });
  try {
    await assert.rejects(
      loadSeasonLeaderboardData({ seasonId: "season-1" }),
      /Not authorized/,
    );
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});

test("legacy canonical leaderboard behavior retains one entry per user", async () => {
  __setLeaderboardRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async () => ({
          data: [entry("old", "shared"), entry("new", "shared")],
        }),
      },
    },
    queries: {
      visibleSeasonPicks: async () => ({
        data: {
          picks: [pick("p-old", "old"), pick("p-new", "new")],
          completeEntryIds: ["old", "new"],
          tieBreakers: [],
        },
      }),
    },
  });
  try {
    const result = await loadSeasonLeaderboardData({ seasonId: "season-1" });
    assert.equal(result.entries.length, 1);
    assert.equal(result.picks.length, 1);
  } finally {
    __setLeaderboardRepositoryDataClientForTests(null);
  }
});
