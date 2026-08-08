import assert from "node:assert/strict";
import test from "node:test";
import {
  getGameWinner,
  isAdminGameManagementEnabled,
  toGameUpdateInput,
  validateGameDraft,
} from "./adminGameManagement";
import { isSeasonPickLocked } from "./pickWindow";

test("test-season tooling requires an explicit true flag", () => {
  assert.equal(isAdminGameManagementEnabled(undefined), false);
  assert.equal(isAdminGameManagementEnabled({}), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: false }), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: true }), true);
});

test("test-season gating and pick locking remain independent", () => {
  assert.equal(
    isAdminGameManagementEnabled({ status: "locked", isTestSeason: false }),
    false,
  );
  assert.equal(
    isSeasonPickLocked({
      seasonStatus: "open",
      picksLockAt: "2099-01-01T00:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isAdminGameManagementEnabled({ status: "open", isTestSeason: true }),
    true,
  );
});

test("final game winner is derived from the existing team abbreviation field", () => {
  assert.equal(getGameWinner({ status: "in_progress", teamAScore: 10, teamBScore: 7, teamAAbbr: "AAA", teamBAbbr: "BBB" }), "");
  assert.equal(getGameWinner({ status: "final", teamAScore: 31, teamBScore: 28, teamAAbbr: "AAA", teamBAbbr: "BBB" }), "AAA");
  assert.equal(getGameWinner({ status: "final", teamAScore: 28, teamBScore: 31, teamAAbbr: "AAA", teamBAbbr: "BBB" }), "BBB");
});

test("final games require unequal non-negative integer scores", () => {
  const base = { bowlName: "Test Bowl", kickoffAt: "2026-08-02T12:00", status: "final", teamAScore: "31", teamBScore: "28" };
  assert.equal(validateGameDraft(base), "");
  assert.equal(validateGameDraft({ ...base, teamBScore: "31" }), "Final games must have a winner.");
  assert.equal(validateGameDraft({ ...base, teamBScore: "" }), "Final games require valid non-negative scores.");
  assert.equal(validateGameDraft({ ...base, teamBScore: "-1" }), "Final games require valid non-negative scores.");
});

test("update input clears winner and live detail for non-final games", () => {
  const input = toGameUpdateInput({ id: "game", bowlName: " Test Bowl ", kickoffAt: "2026-08-02T12:00:00Z", status: "scheduled", teamAScore: "", teamBScore: "", teamAAbbr: "AAA", teamBAbbr: "BBB", statusDetail: "Q2 5:32" });
  assert.equal(input.bowlName, "Test Bowl");
  assert.equal(input.winnerTeam, "");
  assert.equal(input.statusDetail, null);
  assert.equal(input.teamAScore, null);
});
