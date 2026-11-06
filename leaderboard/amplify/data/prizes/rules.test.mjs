import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPrizeReader,
  assertPayoutAdmin,
  buildPrizeSummary,
  preparePayoutPublication,
} from "./rules.mjs";

const player = { sub: "player-1", groups: ["player"] };
const admin = { sub: "admin-1", groups: ["admin"] };
const tiers = JSON.stringify([{ position: 1, percentageBasisPoints: 10000, label: "Champion" }]);

test("players and admins may read aggregate prizes; only admins may publish", () => {
  assert.doesNotThrow(() => assertPrizeReader(player));
  assert.doesNotThrow(() => assertPrizeReader(admin));
  assert.throws(() => assertPrizeReader({ sub: "pending", groups: [] }), /signed-in/);
  assert.throws(() => assertPayoutAdmin(player), /Administrator/);
  assert.throws(() => preparePayoutPublication(player, tiers), /Administrator/);
  assert.equal(preparePayoutPublication(admin, tiers), tiers);
  assert.throws(() => preparePayoutPublication(admin, JSON.stringify([
    { position: 1, percentageBasisPoints: 9000 },
  ])), /100%/);
});

test("the server returns only aggregate data for an active season", () => {
  const summary = buildPrizeSummary({
    season: { id: "season-1", isActive: true },
    seasonId: "season-1",
    entries: [
      { id: "entry-1", owner: "player-1", seasonId: "season-1", paymentStatus: "paid" },
      { id: "entry-2", owner: "player-2", seasonId: "season-1", paymentStatus: "unpaid" },
    ],
    picks: [],
    config: { payoutConfigJson: tiers },
  });
  assert.deepEqual(summary, {
    seasonId: "season-1", confirmedPaidEntryCount: 1,
    prizePoolCents: 500, payoutConfigJson: tiers,
  });
  assert.equal("entries" in summary, false);
  assert.throws(() => buildPrizeSummary({
    season: { id: "season-1", isActive: false },
    seasonId: "season-1", entries: [], picks: [], config: null,
  }), /active season/);
});
