import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardEntries } from "./dashboardEntryProgress.js";

const entries = [
  { id: "entry-a", entryName: "First Entry", tieBreakerValue: 42 },
  { id: "entry-b", entryName: "Second Entry", tieBreakerValue: null },
];

const requiredGameIds = ["game-1", "game-2"];

test("dashboard entries use each entry's own saved pick progress", () => {
  const dashboardEntries = buildDashboardEntries({
    entries,
    totalPicks: 2,
    tieBreakerRequired: false,
    progressByEntryId: {
      "entry-a": {
        requiredGameIds,
        selectionsByGameId: {
          "game-1": "AAA",
          "game-2": "BBB",
        },
      },
      "entry-b": {
        requiredGameIds,
        selectionsByGameId: {
          "game-1": "AAA",
        },
      },
    },
  });

  assert.deepEqual(
    dashboardEntries.map((entry) => [
      entry.name,
      entry.completedPicks,
      entry.totalPicks,
      entry.status,
    ]),
    [
      ["First Entry", 2, 2, "Complete"],
      ["Second Entry", 1, 2, "In Progress"],
    ],
  );
});

test("locked dashboard entries report locked status without changing progress", () => {
  const dashboardEntries = buildDashboardEntries({
    entries: [entries[0]],
    totalPicks: 2,
    picksLocked: true,
    progressByEntryId: {
      "entry-a": {
        requiredGameIds,
        selectionsByGameId: {
          "game-1": "AAA",
        },
      },
    },
  });

  assert.equal(dashboardEntries[0].completedPicks, 1);
  assert.equal(dashboardEntries[0].status, "Locked");
});

test("game progress stays separate from overall completion and ignores stale games", () => {
  const selectionsByGameId = {
    "game-1": "AAA",
    "game-2": "BBB",
    "old-game": "CCC",
  };
  const dashboardEntries = buildDashboardEntries({
    entries: [
      { id: "complete", tieBreakerValue: 0 },
      { id: "missing-tie", tieBreakerValue: null },
      { id: "invalid-tie", tieBreakerValue: -1 },
    ],
    totalPicks: 2,
    tieBreakerRequired: true,
    progressByEntryId: Object.fromEntries(
      ["complete", "missing-tie", "invalid-tie"].map((id) => [
        id,
        { requiredGameIds, selectionsByGameId },
      ]),
    ),
  });

  assert.deepEqual(
    dashboardEntries.map(({ completedPicks, isComplete, needsTieBreaker }) => [
      completedPicks,
      isComplete,
      needsTieBreaker,
    ]),
    [
      [2, true, false],
      [2, false, true],
      [2, false, true],
    ],
  );
});

test("missing a required pick never completes a pick set", () => {
  const [missingPick] = buildDashboardEntries({
    entries: [{ id: "entry-a", tieBreakerValue: 42 }],
    totalPicks: 2,
    tieBreakerRequired: true,
    progressByEntryId: {
      "entry-a": {
        requiredGameIds,
        selectionsByGameId: { "game-1": "AAA" },
      },
    },
  });
  assert.equal(missingPick.completedPicks, 1);
  assert.equal(missingPick.isComplete, false);
});
