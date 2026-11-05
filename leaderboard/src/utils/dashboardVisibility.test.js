import assert from "node:assert/strict";
import test from "node:test";
import {
  canShowDashboardLeaderboard,
  getDashboardPaymentState,
  getFirstKickoffTime,
  shouldShowAccountPaymentNotification,
} from "./dashboardVisibility.js";

const games = [
  { kickoffAt: "2026-12-26T17:00:00Z" },
  { kickoffAt: "2026-12-25T12:00:00-05:00" },
  { kickoffAt: "invalid" },
];

test("Dashboard leaderboard starts at the first actual game kickoff", () => {
  const kickoff = getFirstKickoffTime(games);
  assert.equal(kickoff, Date.parse("2026-12-25T17:00:00Z"));
  assert.equal(canShowDashboardLeaderboard(kickoff, kickoff - 1), false);
  assert.equal(canShowDashboardLeaderboard(kickoff, kickoff), true);
  assert.equal(canShowDashboardLeaderboard(kickoff, kickoff + 1), true);
});

test("picks opening and season changes do not determine leaderboard visibility", () => {
  const firstSeasonKickoff = getFirstKickoffTime(games);
  const secondSeasonKickoff = getFirstKickoffTime([
    { kickoffAt: "2027-01-01T12:00:00Z" },
  ]);
  const now = Date.parse("2026-12-26T00:00:00Z");
  const picksOpenTime = Date.parse("2026-12-24T12:00:00Z");
  assert.equal(
    canShowDashboardLeaderboard(firstSeasonKickoff, picksOpenTime + 1),
    false,
  );
  assert.equal(canShowDashboardLeaderboard(firstSeasonKickoff, now), true);
  assert.equal(canShowDashboardLeaderboard(secondSeasonKickoff, now), false);
});

test("missing, invalid, and timezone-free schedules stay hidden", () => {
  assert.equal(getFirstKickoffTime([]), null);
  assert.equal(getFirstKickoffTime([{ kickoffAt: "bad" }]), null);
  assert.equal(
    getFirstKickoffTime([{ kickoffAt: "2026-12-25T12:00:00" }]),
    null,
  );
  assert.equal(canShowDashboardLeaderboard(null, Date.now()), false);
});

test("only an explicit unpaid entry produces a payment warning", () => {
  assert.equal(getDashboardPaymentState({ paymentStatus: "unpaid" }), "unpaid");
  assert.equal(getDashboardPaymentState({ paymentStatus: "PAID" }), "paid");
  assert.equal(
    getDashboardPaymentState({ paymentStatus: null }),
    "unavailable",
  );
  assert.equal(getDashboardPaymentState({ paymentStatus: "waived" }), "waived");
  assert.equal(
    getDashboardPaymentState({ paymentStatus: "refunded" }),
    "refunded",
  );
  assert.equal(getDashboardPaymentState(null), "none");
});

test("desktop Account notification requires loaded, explicit unpaid status", () => {
  const ready = { entriesReady: true, entriesLoading: false };
  assert.equal(shouldShowAccountPaymentNotification({ ...ready, currentEntry: { paymentStatus: "unpaid" } }), true);
  for (const paymentStatus of ["paid", null, undefined, "waived"]) {
    assert.equal(shouldShowAccountPaymentNotification({ ...ready, currentEntry: { paymentStatus } }), false);
  }
  assert.equal(shouldShowAccountPaymentNotification({ ...ready, entriesLoading: true, currentEntry: { paymentStatus: "unpaid" } }), false);
  assert.equal(shouldShowAccountPaymentNotification({ ...ready, entriesReady: false, currentEntry: { paymentStatus: "unpaid" } }), false);
});
