import assert from "node:assert/strict";
import test from "node:test";
import {
  isAccountPageLoading,
  isDashboardPageLoading,
  isGamesPageLoading,
  isLeaderboardPageLoading,
  isPicksPageLoading,
} from "./pageReadiness.js";
import { createLeaderboardLoadState } from "../hooks/useSeasonLeaderboard.js";

const readyEntryScope = {
  entriesError: "",
  entriesLoading: false,
  entriesReady: true,
  scoreboardError: "",
  scoreboardLoading: false,
  seasonId: "season-1",
};

test("dashboard waits for initial scoreboard, entry, and selected-entry picks", () => {
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      scoreboardLoading: true,
    }),
    true,
  );
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      entriesLoading: true,
    }),
    true,
  );
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      currentEntryId: "entry-1",
      hydratedEntryId: "",
      picksError: "",
      picksLoading: true,
    }),
    true,
  );
});

test("dashboard renders resolved missing entries and ignores optional leaderboard loading", () => {
  assert.equal(isDashboardPageLoading(readyEntryScope), false);
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      currentEntryId: "entry-1",
      hydratedEntryId: "entry-1",
      picksError: "",
      picksLoading: false,
    }),
    false,
  );
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      entriesLoading: true,
      entriesReady: false,
      usesEntryData: false,
    }),
    false,
  );
});

test("critical errors stop dashboard loading instead of spinning indefinitely", () => {
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      scoreboardError: "Scoreboard unavailable",
      scoreboardLoading: true,
    }),
    false,
  );
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      entriesError: "Entry unavailable",
      entriesReady: false,
    }),
    false,
  );
  assert.equal(
    isDashboardPageLoading({
      ...readyEntryScope,
      currentEntryId: "entry-1",
      hydratedEntryId: "",
      picksError: "Picks unavailable",
      picksLoading: false,
    }),
    false,
  );
});

test("account waits for scoped entry readiness but accepts a resolved missing entry", () => {
  assert.equal(
    isAccountPageLoading({ ...readyEntryScope, entriesLoading: true }),
    true,
  );
  assert.equal(isAccountPageLoading(readyEntryScope), false);
  assert.equal(
    isAccountPageLoading({
      ...readyEntryScope,
      entriesError: "Entry unavailable",
      entriesReady: false,
    }),
    false,
  );
});

test("games use only initial scoreboard loading, not background refresh", () => {
  assert.equal(
    isGamesPageLoading({ scoreboardLoading: true, scoreboardError: "" }),
    true,
  );
  assert.equal(
    isGamesPageLoading({ scoreboardLoading: false, scoreboardError: "" }),
    false,
  );
  assert.equal(
    isGamesPageLoading({
      scoreboardLoading: true,
      scoreboardError: "Unable to load games",
    }),
    false,
  );
});

test("leaderboard distinguishes initial, empty, refresh, and season-switch states", () => {
  assert.equal(
    isLeaderboardPageLoading({
      scoreboardLoading: true,
      scoreboardError: "",
      leaderboardError: "",
      leaderboardReady: false,
      leaderboardSeasonId: "",
      seasonId: "",
    }),
    true,
  );
  assert.equal(
    isLeaderboardPageLoading({
      scoreboardLoading: false,
      scoreboardError: "",
      leaderboardError: "",
      leaderboardReady: true,
      leaderboardSeasonId: "season-1",
      seasonId: "season-1",
    }),
    false,
  );
  assert.equal(
    isLeaderboardPageLoading({
      scoreboardLoading: false,
      scoreboardError: "",
      leaderboardError: "",
      leaderboardReady: true,
      leaderboardSeasonId: "season-1",
      seasonId: "season-2",
    }),
    true,
  );
});

test("same-season leaderboard refresh preserves rows while season changes clear them", () => {
  const current = {
    loading: false,
    error: "",
    rows: [{ rank: 1, username: "BowlFan" }],
    ready: true,
    seasonId: "season-1",
  };

  assert.deepEqual(createLeaderboardLoadState(current, "season-1"), {
    ...current,
    loading: true,
  });
  assert.deepEqual(createLeaderboardLoadState(current, "season-2"), {
    loading: true,
    error: "",
    rows: [],
    ready: false,
    seasonId: "season-2",
  });
});

const readyPicksScope = {
  activeDraftReady: true,
  currentEntryId: "entry-1",
  draftCacheReady: true,
  draftReconciled: true,
  entriesError: "",
  entriesLoading: false,
  entriesReady: true,
  hydratedEntryId: "entry-1",
  picksError: "",
  picksLocked: false,
  scoreboardError: "",
  scoreboardLoading: false,
  seasonId: "season-1",
};

test("Picks waits for scoreboard, entry, server picks, and local draft reconciliation", () => {
  for (const pendingState of [
    { scoreboardLoading: true },
    { entriesLoading: true, entriesReady: false },
    { hydratedEntryId: "" },
    { draftCacheReady: false },
    { activeDraftReady: false },
    { draftReconciled: false },
  ]) {
    assert.equal(
      isPicksPageLoading({ ...readyPicksScope, ...pendingState }),
      true,
    );
  }
  assert.equal(isPicksPageLoading(readyPicksScope), false);
});

test("Picks resolves legitimate missing entries, locked picks, and load errors", () => {
  assert.equal(
    isPicksPageLoading({
      ...readyPicksScope,
      currentEntryId: "",
      hydratedEntryId: "",
      activeDraftReady: false,
      draftReconciled: false,
    }),
    false,
  );
  assert.equal(
    isPicksPageLoading({
      ...readyPicksScope,
      activeDraftReady: false,
      draftCacheReady: false,
      draftReconciled: false,
      picksLocked: true,
    }),
    false,
  );
  for (const failure of [
    { scoreboardError: "Scoreboard unavailable", scoreboardLoading: true },
    { entriesError: "Entry unavailable", entriesReady: false },
    { picksError: "Picks unavailable", hydratedEntryId: "" },
  ]) {
    assert.equal(isPicksPageLoading({ ...readyPicksScope, ...failure }), false);
  }
});

test("Picks readiness is independent of autosave and bulk-operation states", () => {
  for (const mutationState of [
    { saveState: "saving" },
    { tieBreakerSaving: true },
    { randomizePhase: "saving" },
    { bulkOperation: "clear" },
  ]) {
    assert.equal(
      isPicksPageLoading({ ...readyPicksScope, ...mutationState }),
      false,
    );
  }
});
