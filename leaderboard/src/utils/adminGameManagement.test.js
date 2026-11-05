import assert from "node:assert/strict";
import test from "node:test";
import {
  getGameWinner,
  isAdminGameManagementEnabled,
  mergeAdminGame,
  toGameUpdateInput,
  validateGameDraft,
} from "./adminGameManagement";
import { isSeasonPickLocked } from "./pickWindow";
import { formatStoredGame } from "./formatGameData";
import { scoreEntries } from "./leaderboardScoring";

test("test-season tooling requires an explicit true flag", () => {
  assert.equal(isAdminGameManagementEnabled(undefined), false);
  assert.equal(isAdminGameManagementEnabled({}), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: false }), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: true }), true);
});

test("a confirmed update remains visible when the game index is catching up", () => {
  const rows = [{ id: "later", kickoffAt: "2026-11-05T02:20:00Z" }];
  const saved = { id: "saved", kickoffAt: "2026-11-05T02:10:00Z", status: "final" };
  assert.deepEqual(mergeAdminGame(rows, saved).map((game) => game.id), ["saved", "later"]);
  assert.equal(mergeAdminGame([...rows, { ...saved, status: "scheduled" }], saved)[0].status, "final");
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
  assert.equal(
    getGameWinner({
      status: "in_progress",
      teamAScore: 10,
      teamBScore: 7,
      teamAAbbr: "AAA",
      teamBAbbr: "BBB",
    }),
    "",
  );
  assert.equal(
    getGameWinner({
      status: "final",
      teamAScore: 31,
      teamBScore: 28,
      teamAAbbr: "AAA",
      teamBAbbr: "BBB",
    }),
    "AAA",
  );
  assert.equal(
    getGameWinner({
      status: "final",
      teamAScore: 28,
      teamBScore: 31,
      teamAAbbr: "AAA",
      teamBAbbr: "BBB",
    }),
    "BBB",
  );
});

test("final games require unequal non-negative integer scores", () => {
  const base = {
    bowlName: "Test Bowl",
    kickoffAt: "2026-08-02T12:00",
    status: "final",
    teamAScore: "31",
    teamBScore: "28",
  };
  assert.equal(validateGameDraft(base), "");
  assert.equal(
    validateGameDraft({ ...base, teamBScore: "31" }),
    "Final games must have a winner.",
  );
  assert.equal(
    validateGameDraft({ ...base, teamBScore: "" }),
    "Final games require valid non-negative scores.",
  );
  assert.equal(
    validateGameDraft({ ...base, teamBScore: "-1" }),
    "Final games require valid non-negative scores.",
  );
});

test("update input clears winner and live detail for non-final games", () => {
  const input = toGameUpdateInput({
    id: "game",
    bowlName: " Test Bowl ",
    kickoffAt: "2026-08-02T12:00:00Z",
    status: "scheduled",
    teamAScore: "",
    teamBScore: "",
    teamAAbbr: "AAA",
    teamBAbbr: "BBB",
    statusDetail: "Q2 5:32",
  });
  assert.equal(input.bowlName, "Test Bowl");
  assert.equal(input.winnerTeam, "");
  assert.equal(input.statusDetail, null);
  assert.equal(input.teamAScore, null);
});

test("a saved test-season game flows through Games and existing leaderboard scoring", () => {
  const stored = {
    id: "game-one",
    seasonId: "test26-r2",
    bowlName: "Test Bowl",
    kickoffAt: "2026-12-20T18:00:00Z",
    status: "scheduled",
    teamA: "Alpha",
    teamAAbbr: "AAA",
    teamB: "Beta",
    teamBAbbr: "BBB",
  };
  const live = { ...stored, ...toGameUpdateInput({ ...stored, status: "in_progress", teamAScore: 14, teamBScore: 10 }) };
  assert.equal(formatStoredGame(live).state, "in");
  assert.equal(formatStoredGame(live).away.score, "14");
  const final = { ...live, ...toGameUpdateInput({ ...live, status: "final", teamAScore: 31, teamBScore: 28 }) };
  const display = formatStoredGame(final);
  assert.equal(display.isFinal, true);
  assert.equal(display.winnerTeam, "AAA");
  assert.equal(display.away.score, "31");
  const rows = scoreEntries({
    games: [display],
    entries: [{ id: "entry-one", entryName: "One" }],
    picks: [{ entryId: "entry-one", gameId: "game-one", selectedTeam: "AAA" }],
    completeEntryIds: ["entry-one"],
  });
  assert.equal(rows[0].points, 1);
});
