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
