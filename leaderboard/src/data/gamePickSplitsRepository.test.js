import assert from "node:assert/strict";
import test from "node:test";
import { __setGamePickSplitsDataClientForTests, loadGamePickSplitViews } from "./gamePickSplitsRepository";

test("game splits use server-filtered picks and aggregate counts before kickoff", async () => {
  const calls = [];
  __setGamePickSplitsDataClientForTests({
    models: {
      Entry: { list: async () => ({ data: [
        { id: "own-entry", seasonId: "s1", entryName: "Mine", userProfile: { id: "u1" }, isDeleted: false },
        { id: "other-entry", seasonId: "s1", entryName: "Other", userProfile: { id: "u2" }, isDeleted: false },
      ] }) },
      Pick: { list: () => { throw new Error("Raw picks must not be queried."); } },
    },
    queries: { visibleSeasonPicks: async (...args) => {
      calls.push(args);
      return { data: {
        picks: [{ id: "p1", seasonId: "s1", entryId: "own-entry", gameId: "g1", selectedTeam: "AAA" }],
        submissionCounts: [{ gameId: "g1", count: 2 }],
        completeEntryIds: [], tieBreakers: [],
      } };
    } },
  });
  try {
    const game = { id: "g1", state: "pre", startDate: "2099-01-01T00:00:00Z", away: { abbr: "AAA" }, home: { abbr: "BBB" } };
    const views = await loadGamePickSplitViews({ seasonId: "s1", games: [game], currentEntries: [{ id: "own-entry" }], owner: "u1", now: Date.parse("2026-01-01T00:00:00Z") });
    assert.equal(views.g1.totalSubmittedPicks, 2);
    assert.equal(views.g1.totalRevealedPicks, 0);
    assert.equal(views.g1.ownedPicks.length, 1);
    assert.deepEqual(calls, [[{ seasonId: "s1" }, { authMode: "userPool" }]]);
  } finally {
    __setGamePickSplitsDataClientForTests(null);
  }
});
