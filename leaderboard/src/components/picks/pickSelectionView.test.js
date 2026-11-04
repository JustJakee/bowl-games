import assert from "node:assert/strict";
import test from "node:test";
import { buildPickSelectionView } from "./pickSelectionView";

const games = [
  {
    id: "game-1",
    isTieBreakerGame: false,
  },
  {
    id: "game-2",
    isTieBreakerGame: true,
  },
];

test("loading the selected entry hides stale counts and selected picks", () => {
  const loadingView = buildPickSelectionView({
    currentEntry: { id: "entry-b" },
    hydratedEntryId: "entry-a",
    activeDraft: {
      selectionsByGameId: {
        "game-1": "AAA",
        "game-2": "111",
      },
      tieBreakerValue: "42",
    },
    games,
    picksLoading: true,
    picksLocked: false,
    tieBreakerRequired: true,
  });

  assert.equal(loadingView.isLoadingSelectedEntryPicks, true);
  assert.equal(loadingView.entryStatus, "LOADING");
  assert.equal(loadingView.selectedCount, 0);
  assert.equal(loadingView.incompleteCount, 2);
  assert.equal(loadingView.progressPercent, 0);
  assert.deepEqual(loadingView.selectionsByGameId, {});
  assert.equal(loadingView.tieBreakerValue, "");
});

test("a loaded entry still reports its own counts and status", () => {
  const loadedView = buildPickSelectionView({
    currentEntry: { id: "entry-a" },
    hydratedEntryId: "entry-a",
    activeDraft: {
      selectionsByGameId: { "game-1": "AAA", "game-2": "111" },
      tieBreakerValue: "42",
    },
    games,
    picksLoading: false,
    picksLocked: false,
    tieBreakerRequired: true,
  });

  assert.equal(loadedView.isLoadingSelectedEntryPicks, false);
  assert.equal(loadedView.entryStatus, "COMPLETE");
  assert.equal(loadedView.selectedCount, 2);
  assert.equal(loadedView.incompleteCount, 0);
  assert.equal(loadedView.missingRequiredTieBreaker, false);
  assert.equal(loadedView.progressPercent, 100);
  assert.deepEqual(loadedView.selectionsByGameId, {
    "game-1": "AAA",
    "game-2": "111",
  });
  assert.equal(loadedView.tieBreakerValue, "42");
});

test("background refresh keeps the currently loaded entry visible", () => {
  const refreshingView = buildPickSelectionView({
    currentEntry: { id: "entry-a" },
    hydratedEntryId: "entry-a",
    activeDraft: {
      selectionsByGameId: { "game-1": "AAA" },
      tieBreakerValue: "",
    },
    games,
    picksLoading: true,
    picksLocked: false,
    tieBreakerRequired: false,
  });

  assert.equal(refreshingView.isLoadingSelectedEntryPicks, false);
  assert.equal(refreshingView.entryStatus, "DRAFT");
  assert.equal(refreshingView.selectedCount, 1);
  assert.equal(refreshingView.incompleteCount, 1);
  assert.equal(refreshingView.progressPercent, 50);
  assert.deepEqual(refreshingView.selectionsByGameId, {
    "game-1": "AAA",
  });
});

test("48 selected teams can correctly leave the required championship tiebreaker incomplete", () => {
  const seasonGames = Array.from({ length: 48 }, (_, index) => ({
    id: `game-${index}`,
    isTieBreakerGame: index === 47,
  }));
  const selectionsByGameId = Object.fromEntries(
    seasonGames.map(({ id }) => [id, "AAA"]),
  );
  const input = {
    currentEntry: { id: "entry-a" },
    hydratedEntryId: "entry-a",
    games: seasonGames,
    activeDraft: { selectionsByGameId, tieBreakerValue: "" },
    tieBreakerRequired: true,
  };
  const missing = buildPickSelectionView(input);
  assert.equal(missing.selectedCount, 48);
  assert.equal(missing.incompleteCount, 1);
  assert.equal(missing.missingRequiredTieBreaker, true);
  assert.equal(missing.entryStatus, "DRAFT");
  const complete = buildPickSelectionView({
    ...input,
    activeDraft: { selectionsByGameId, tieBreakerValue: 0 },
  });
  assert.equal(complete.incompleteCount, 0);
  assert.equal(complete.missingRequiredTieBreaker, false);
  assert.equal(complete.entryStatus, "COMPLETE");
  const optional = buildPickSelectionView({
    ...input,
    tieBreakerRequired: false,
  });
  assert.equal(optional.incompleteCount, 0);
  assert.equal(optional.missingRequiredTieBreaker, false);
  assert.equal(optional.entryStatus, "COMPLETE");
});

test("deselection reduces progress and stale game IDs do not count toward completion", () => {
  const view = buildPickSelectionView({
    currentEntry: { id: "entry-a" },
    hydratedEntryId: "entry-a",
    games,
    activeDraft: {
      selectionsByGameId: { "game-2": "AAA", removed: "BBB" },
      tieBreakerValue: "42",
    },
    tieBreakerRequired: true,
  });
  assert.equal(view.selectedCount, 1);
  assert.equal(view.incompleteCount, 1);
  assert.equal(view.progressPercent, 50);
  assert.equal(view.entryStatus, "DRAFT");
});
