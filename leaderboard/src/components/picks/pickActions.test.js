import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEditableGameIdSet,
  clearEditableSelections,
  getFilterCountBadgeColors,
  getPickActionsState,
  randomizeIncompleteSelections,
  toggleGameSelection,
} from "./pickActions.js";

const games = [
  {
    id: "game-1",
    away: { abbr: "AAA" },
    home: { abbr: "BBB" },
  },
  {
    id: "game-2",
    away: { abbr: "CCC" },
    home: { abbr: "DDD" },
  },
  {
    id: "game-3",
    away: { abbr: "EEE" },
    home: { abbr: "FFF" },
  },
];

test("randomize label follows editable pick progress", () => {
  const editableGameIds = new Set(games.map(({ id }) => id));

  assert.equal(
    getPickActionsState({ games, editableGameIds }).randomizeLabel,
    "Randomize All Picks",
  );
  assert.equal(
    getPickActionsState({
      games,
      editableGameIds,
      selectionsByGameId: { "game-1": "AAA" },
    }).randomizeLabel,
    "Randomize Remaining Picks",
  );
  assert.equal(
    getPickActionsState({
      games,
      editableGameIds,
      selectionsByGameId: {
        "game-1": "AAA",
        "game-2": "CCC",
        "game-3": "EEE",
      },
    }).canRandomize,
    false,
  );
});

test("randomize fills only editable incomplete games with valid teams", () => {
  const selections = randomizeIncompleteSelections({
    games,
    selectionsByGameId: {
      "game-1": "AAA",
      "game-3": "FFF",
    },
    editableGameIds: new Set(["game-1", "game-2"]),
    random: () => 0.75,
  });

  assert.deepEqual(selections, {
    "game-1": "AAA",
    "game-2": "DDD",
    "game-3": "FFF",
  });
});

test("randomize preserves tiebreaker-like unrelated draft fields by changing only selections", () => {
  const draft = {
    tieBreakerValue: "42",
    selectionsByGameId: { "game-1": "AAA" },
  };
  const nextSelections = randomizeIncompleteSelections({
    games,
    selectionsByGameId: draft.selectionsByGameId,
    editableGameIds: new Set(["game-1", "game-2"]),
    random: () => 0.25,
  });

  assert.equal(draft.tieBreakerValue, "42");
  assert.deepEqual(nextSelections, {
    "game-1": "AAA",
    "game-2": "CCC",
  });
});

test("clear removes editable selections and preserves locked selections", () => {
  assert.deepEqual(
    clearEditableSelections({
      selectionsByGameId: {
        "game-1": "AAA",
        "game-2": "CCC",
        "game-3": "EEE",
      },
      editableGameIds: new Set(["game-1", "game-2"]),
    }),
    { "game-3": "EEE" },
  );
});

test("team selection toggles, switches, and respects locking", () => {
  const editableGameIds = new Set(["game-1"]);
  const selected = toggleGameSelection({
    gameId: "game-1",
    selectedTeam: "AAA",
    editableGameIds,
  });
  const unchecked = toggleGameSelection({
    gameId: "game-1",
    selectedTeam: "AAA",
    selectionsByGameId: selected,
    editableGameIds,
  });
  const switched = toggleGameSelection({
    gameId: "game-1",
    selectedTeam: "BBB",
    selectionsByGameId: selected,
    editableGameIds,
  });
  const locked = toggleGameSelection({
    gameId: "game-2",
    selectedTeam: "CCC",
    selectionsByGameId: { "game-2": "DDD" },
    editableGameIds,
  });

  assert.deepEqual(selected, { "game-1": "AAA" });
  assert.deepEqual(unchecked, {});
  assert.deepEqual(switched, { "game-1": "BBB" });
  assert.deepEqual(locked, { "game-2": "DDD" });
});

test("season lock produces no editable games or bulk actions", () => {
  const editableGameIds = buildEditableGameIdSet({
    games,
    picksLocked: true,
  });
  const state = getPickActionsState({
    games,
    selectionsByGameId: { "game-1": "AAA" },
    editableGameIds,
  });

  assert.equal(editableGameIds.size, 0);
  assert.equal(state.canClear, false);
  assert.equal(state.canRandomize, false);
});

test("filter count badges use contrasting theme tokens in both states", () => {
  assert.deepEqual(getFilterCountBadgeColors(true), {
    backgroundColor: "background.default",
    color: "text.primary",
  });
  assert.deepEqual(getFilterCountBadgeColors(false), {
    backgroundColor: "primary.main",
    color: "primary.contrastText",
  });
});
