import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSyncedDraft } from "../components/picks/picksAutosaveState";
import {
  formatPickLockMessage,
  isPickWindowLocked,
  isSeasonPickLocked,
} from "./pickWindow";

const picksLockAt = "2026-08-02T12:00:00.000Z";

test("the global pick window is open before, and locked at and after, picksLockAt", () => {
  assert.equal(
    isPickWindowLocked(
      picksLockAt,
      new Date("2026-08-02T11:59:59.999Z").getTime(),
    ),
    false,
  );
  assert.equal(
    isPickWindowLocked(picksLockAt, new Date(picksLockAt).getTime()),
    true,
  );
  assert.equal(
    isPickWindowLocked(
      picksLockAt,
      new Date("2026-08-02T12:00:00.001Z").getTime(),
    ),
    true,
  );
});

test("an explicit locked season overrides a future pick deadline", () => {
  assert.equal(
    isSeasonPickLocked({
      seasonStatus: "locked",
      picksLockAt: "2099-01-01T00:00:00.000Z",
      now: Date.now(),
    }),
    true,
  );
});

test("lock messaging uses the SeasonConfig deadline and describes one global rule", () => {
  const seasonConfig = { picksLockAt };
  const message = formatPickLockMessage(seasonConfig.picksLockAt);

  assert.match(message, /^All picks lock when the first game begins on /);
  assert.match(message, /August 2, 2026/);
  assert.doesNotMatch(message, /per-game/i);

  const otherMessage = formatPickLockMessage("2026-08-03T12:00:00.000Z");
  assert.notEqual(message, otherMessage);
});

test("the picks UI contains no stale per-game locking copy", async () => {
  const source = await readFile(
    new URL("../components/picks/PicksWorkspace.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /per-game locking/i);
  assert.match(source, /formatPickLockMessage\(picksLockAt\)/);
});

test("saved selections remain visible when the entry enters locked review", () => {
  const syncedDraft = buildSyncedDraft({
    entry: {
      entryName: "Player Entry 1",
      tieBreakerValue: 42,
    },
    selectionsByGameId: { "game-1": "AAA" },
  });

  assert.equal(isPickWindowLocked(picksLockAt, Date.parse(picksLockAt)), true);
  assert.deepEqual(syncedDraft.selectionsByGameId, { "game-1": "AAA" });
  assert.equal(syncedDraft.tieBreakerValue, "42");
  assert.equal(syncedDraft.dirty, false);
});
