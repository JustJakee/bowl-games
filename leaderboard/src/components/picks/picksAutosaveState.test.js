import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAutosaveFailureState,
  buildAutosaveSuccessState,
  buildSyncedDraft,
} from "./picksAutosaveState";

test("a successful backend save replaces the pending draft with synchronized data", () => {
  const draft = buildSyncedDraft({
    entry: {
      entryName: "Player Entry 1",
      tieBreakerValue: null,
    },
    selectionsByGameId: { "game-1": "AAA" },
  });

  assert.deepEqual(draft, {
    entryName: "Player Entry 1",
    selectionsByGameId: { "game-1": "AAA" },
    tieBreakerValue: "",
    dirty: false,
  });
  assert.deepEqual(buildAutosaveSuccessState(), {
    state: "saved",
    message: "Saved to account",
    detail: "",
  });
});

test("a failed backend save remains visibly device-only instead of reporting success", () => {
  assert.deepEqual(buildAutosaveFailureState(new Error("Save rejected.")), {
    state: "device",
    message: "Saved to device",
    detail: "Save rejected.",
  });
});
