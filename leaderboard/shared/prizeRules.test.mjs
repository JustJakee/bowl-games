import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePayouts,
  calculatePrizePoolCents,
  countConfirmedPaidEntries,
  formatUsdCents,
  parsePayoutTiers,
  validatePayoutTiers,
} from "./prizeRules.mjs";

const entry = (id, owner, paymentStatus, extra = {}) => ({
  id, owner, seasonId: "season-1", paymentStatus,
  isDeleted: false, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", ...extra,
});

test("only canonical, active-season, explicitly paid entries enter the pool", () => {
  const entries = [
    entry("old", "owner-1", "paid"),
    entry("current", "owner-1", "unpaid", { updatedAt: "2026-01-03T00:00:00Z" }),
    entry("linked-old", "owner-1", "paid", { userProfileId: "profile-1" }),
    entry("paid", "owner-2", "paid"),
    entry("uppercase", "owner-3", "PAID"),
    entry("unknown", "owner-4", "unknown"),
    entry("missing", "owner-5", null),
    entry("waived", "owner-6", "waived"),
    entry("refunded", "owner-7", "refunded"),
    entry("deleted", "owner-8", "paid", { isDeleted: true }),
    entry("other-season", "owner-9", "paid", { seasonId: "season-2" }),
    entry("unattributed", null, "paid"),
  ];
  assert.equal(countConfirmedPaidEntries({ entries, seasonId: "season-1" }), 2);
  assert.equal(calculatePrizePoolCents(2), 1000);
  assert.equal(formatUsdCents(1000), "$10.00");
  assert.equal(countConfirmedPaidEntries({ entries: [], seasonId: "season-1" }), 0);
  assert.equal(calculatePrizePoolCents(0), 0);

  const afterPayment = entries.map((row) => row.id === "current"
    ? { ...row, paymentStatus: "paid" } : row);
  assert.equal(countConfirmedPaidEntries({ entries: afterPayment, seasonId: "season-1" }), 3);
  assert.equal(calculatePrizePoolCents(3), 1500);
});

test("legacy canonical selection considers latest pick activity", () => {
  const entries = [
    entry("older-edit", "owner-1", "paid"),
    entry("newer-entry", "owner-1", "unpaid", { updatedAt: "2026-01-03T00:00:00Z" }),
  ];
  const picks = [{ entryId: "older-edit", updatedAt: "2026-01-04T00:00:00Z" }];
  assert.equal(countConfirmedPaidEntries({ entries, picks, seasonId: "season-1" }), 1);
});

test("payout tiers must be unique, positive, consecutive, and exactly 100 percent", () => {
  const valid = validatePayoutTiers([
    { position: 2, percentageBasisPoints: 3333, label: "Runner up" },
    { position: 1, percentageBasisPoints: 6667, label: "Champion" },
  ]);
  assert.deepEqual(valid.map((tier) => tier.position), [1, 2]);
  assert.equal(parsePayoutTiers(null), null);
  assert.throws(() => validatePayoutTiers([{ position: 1, percentageBasisPoints: 5000 }]), /100%/);
  assert.throws(() => validatePayoutTiers([
    { position: 1, percentageBasisPoints: 5000 },
    { position: 1, percentageBasisPoints: 5000 },
  ]), /consecutive/);
  assert.throws(() => validatePayoutTiers([{ position: 1, percentageBasisPoints: -1 }]), /greater than 0/);
  assert.throws(() => validatePayoutTiers([]), /at least one/);
});

test("deterministic cent allocation always distributes the full pool", () => {
  const tiers = validatePayoutTiers([
    { position: 1, percentageBasisPoints: 3333 },
    { position: 2, percentageBasisPoints: 3333 },
    { position: 3, percentageBasisPoints: 3334 },
  ]);
  assert.deepEqual(calculatePayouts(1, tiers).map((tier) => tier.payoutCents), [0, 0, 1]);
  assert.deepEqual(calculatePayouts(2, tiers).map((tier) => tier.payoutCents), [1, 0, 1]);
  const paidCount = 7;
  const payouts = calculatePayouts(calculatePrizePoolCents(paidCount), tiers);
  assert.equal(payouts.reduce((sum, tier) => sum + tier.payoutCents, 0), 3500);
  assert.deepEqual(calculatePayouts(0, tiers).map((tier) => tier.payoutCents), [0, 0, 0]);
});
