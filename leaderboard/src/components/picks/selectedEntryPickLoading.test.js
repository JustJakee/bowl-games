import assert from "node:assert/strict";
import test from "node:test";
import {
  SELECTED_ENTRY_PICK_LOAD_MIN_MS,
  getSelectedEntryPickLoadRemainingMs,
} from "./selectedEntryPickLoading";

test("selected entry loading stays visible for at least 750ms", () => {
  assert.equal(SELECTED_ENTRY_PICK_LOAD_MIN_MS, 750);
  assert.equal(
    getSelectedEntryPickLoadRemainingMs({ startedAt: 1_000, now: 1_100 }),
    650,
  );
  assert.equal(
    getSelectedEntryPickLoadRemainingMs({ startedAt: 1_000, now: 1_750 }),
    0,
  );
  assert.equal(
    getSelectedEntryPickLoadRemainingMs({ startedAt: 0, now: 1_000 }),
    750,
  );
});
