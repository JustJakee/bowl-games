import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGamePickSplitView,
  getGamePickActionState,
} from "./gamePickSplits.js";

const game = {
  id: "game-1",
  startDate: "2026-12-20T18:00:00Z",
  away: {
    abbr: "AAA",
    displayName: "Alpha",
  },
  home: {
    abbr: "BBB",
    displayName: "Beta",
  },
  state: "pre",
};

const entries = [
  { id: "entry-a", entryName: "Alpha Entry", isDeleted: false },
  { id: "entry-b", entryName: "Beta Entry", isDeleted: false },
  { id: "entry-c", entryName: "Charlie Entry", isDeleted: false },
  { id: "entry-deleted", entryName: "Deleted Entry", isDeleted: true },
];

test("other entries' selections are hidden before kickoff", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [
      { entryId: "entry-a", gameId: "game-1" },
      { entryId: "entry-b", gameId: "game-1" },
    ],
    revealedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-b", gameId: "game-1", selectedTeam: "BBB" },
    ],
    ownedPicks: [],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T17:00:00Z").getTime(),
  });

  assert.equal(view.isLocked, false);
  assert.equal(view.totalSubmittedPicks, 2);
  assert.equal(view.totalRevealedPicks, 0);
  assert.deepEqual(
    view.teamSplits.map((team) => team.count),
    [0, 0],
  );
});

test("current user's own entry selection remains visible before kickoff", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [{ entryId: "entry-a", gameId: "game-1" }],
    ownedPicks: [{ entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" }],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T17:00:00Z").getTime(),
  });

  assert.equal(view.teamSplits[0].ownedCount, 1);
  assert.equal(view.teamSplits[0].ownedEntries[0].entryName, "Alpha Entry");
  assert.equal(view.teamSplits[0].count, 0);
});

test("all valid picks reveal after lock and percentages calculate correctly", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [
      { entryId: "entry-a", gameId: "game-1" },
      { entryId: "entry-b", gameId: "game-1" },
      { entryId: "entry-c", gameId: "game-1" },
    ],
    revealedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-b", gameId: "game-1", selectedTeam: "BBB" },
      { entryId: "entry-c", gameId: "game-1", selectedTeam: "BBB" },
    ],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T18:01:00Z").getTime(),
  });

  assert.equal(view.isLocked, true);
  assert.equal(view.totalRevealedPicks, 3);
  assert.equal(view.teamSplits[0].count, 1);
  assert.equal(view.teamSplits[0].percentage, 33);
  assert.equal(view.teamSplits[1].count, 2);
  assert.equal(view.teamSplits[1].percentage, 67);
});

test("zero-pick game does not divide by zero", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [],
    revealedPicks: [],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T18:01:00Z").getTime(),
  });

  assert.equal(view.totalRevealedPicks, 0);
  assert.deepEqual(
    view.teamSplits.map((team) => team.percentage),
    [0, 0],
  );
});

test("deleted entries and unsubmitted entries are excluded from groups", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [
      { entryId: "entry-a", gameId: "game-1" },
      { entryId: "entry-deleted", gameId: "game-1" },
    ],
    revealedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-deleted", gameId: "game-1", selectedTeam: "BBB" },
    ],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T18:01:00Z").getTime(),
  });

  assert.equal(view.totalEligibleEntries, 3);
  assert.equal(view.totalSubmittedPicks, 1);
  assert.equal(view.teamSplits[0].count, 1);
  assert.equal(view.teamSplits[1].count, 0);
  assert.equal(view.unsubmittedCount, 2);
});

test("multiple owned entries split across teams are represented", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [
      { entryId: "entry-a", gameId: "game-1" },
      { entryId: "entry-b", gameId: "game-1" },
    ],
    revealedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-b", gameId: "game-1", selectedTeam: "BBB" },
    ],
    ownedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-b", gameId: "game-1", selectedTeam: "BBB" },
    ],
    currentEntryIds: ["entry-a", "entry-b"],
    now: new Date("2026-12-20T18:01:00Z").getTime(),
  });

  assert.equal(view.teamSplits[0].ownedCount, 1);
  assert.equal(view.teamSplits[1].ownedCount, 1);
  assert.deepEqual(
    view.ownedPicks.map((pick) => [
      pick.entryName,
      pick.selectedTeamName,
    ]),
    [
      ["Alpha Entry", "Alpha"],
      ["Beta Entry", "Beta"],
    ],
  );
});

test("owned entries selecting the same team remain separate rows", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [
      { entryId: "entry-a", gameId: "game-1" },
      { entryId: "entry-b", gameId: "game-1" },
    ],
    ownedPicks: [
      { entryId: "entry-b", gameId: "game-1", selectedTeam: "AAA" },
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "AAA" },
    ],
    currentEntryIds: ["entry-a", "entry-b"],
    now: new Date("2026-12-20T17:00:00Z").getTime(),
  });

  assert.equal(view.ownedPicks.length, 2);
  assert.deepEqual(
    view.ownedPicks.map((pick) => pick.entryName),
    ["Alpha Entry", "Beta Entry"],
  );
});

test("invalid selected teams are excluded after lock", () => {
  const view = buildGamePickSplitView({
    game,
    entries,
    submittedPicks: [{ entryId: "entry-a", gameId: "game-1" }],
    revealedPicks: [
      { entryId: "entry-a", gameId: "game-1", selectedTeam: "CCC" },
    ],
    currentEntryIds: ["entry-a"],
    now: new Date("2026-12-20T18:01:00Z").getTime(),
  });

  assert.equal(view.totalRevealedPicks, 0);
  assert.equal(view.hasInvalidRevealedPicks, true);
});

test("scheduled game action is disabled with the long-form label", () => {
  assert.deepEqual(getGamePickActionState({ isLocked: false }), {
    enabled: false,
    label: "View Game Picks (Available After Kick-Off)",
  });
});

test("live and final game actions are enabled with the route label", () => {
  assert.deepEqual(getGamePickActionState({ isLocked: true }), {
    enabled: true,
    label: "View Game Picks",
  });
});
