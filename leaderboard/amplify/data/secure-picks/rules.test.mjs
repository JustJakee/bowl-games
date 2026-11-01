import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertCanCreateEntry, assertCanSavePick, buildVisibleSeasonPicks, getEffectivePickDeadline, hasGameStarted, oneEntryId, pickableGames } from "./rules.mjs";

const start = Date.parse("2026-11-01T12:00:00Z");
const deadline = Date.parse("2026-11-01T13:00:00Z");
const entry = { id: "e1", owner: "owner-a", seasonId: "test26-r2", isDeleted: false, tieBreakerValue: 42 };
const season = { id: "test26-r2", isActive: true, status: "open" };
const config = { seasonId: season.id, picksOpenAt: new Date(start).toISOString(), picksLockAt: new Date(deadline).toISOString(), tieBreakerRequired: true };
const game = { id: "g1", seasonId: season.id, bowlName: "First Bowl", kickoffAt: new Date(deadline).toISOString(), status: "scheduled", teamAAbbr: "AAA", teamBAbbr: "BBB" };
const championship = { id: "g2", seasonId: season.id, bowlName: "College Football Playoff National Championship Presented by AT&T", kickoffAt: new Date(deadline + 3600000).toISOString(), status: "scheduled", teamAAbbr: "CCC", teamBAbbr: "DDD" };
const input = { identity: { sub: "owner-a", groups: ["player"] }, entry, season, config, games: [game, championship], game, selectedTeam: "AAA" };

test("server rule accepts immediately before, rejects at and after global deadline", () => {
  assert.equal(assertCanSavePick({ ...input, now: deadline - 1 }).owner, "owner-a");
  for (const now of [deadline, deadline + 1])
    assert.throws(() => assertCanSavePick({ ...input, now }), /locked/);
});

test("earliest kickoff can only tighten the configured deadline", () => {
  const early = { ...game, kickoffAt: new Date(deadline - 1000).toISOString() };
  assert.equal(getEffectivePickDeadline({ config, games: [early, championship] }), deadline - 1000);
  assert.throws(() => assertCanSavePick({ ...input, games: [early, championship], game: early, now: deadline - 500 }), /locked/);
});

test("server rule rejects cross-owner, forged identity, missing entry, invalid game and archived season", () => {
  assert.throws(() => assertCanSavePick({ ...input, identity: { sub: "owner-b", groups: ["player"] }, now: deadline - 1 }), /another player/);
  assert.throws(() => assertCanSavePick({ ...input, identity: { sub: "owner-b", owner: "owner-a", groups: ["player"] }, now: deadline - 1 }), /another player/);
  assert.throws(() => assertCanSavePick({ ...input, entry: null, now: deadline - 1 }), /not found/);
  assert.throws(() => assertCanSavePick({ ...input, game: { ...game, seasonId: "other" }, now: deadline - 1 }), /does not belong/);
  assert.throws(() => assertCanSavePick({ ...input, season: { ...season, status: "archived" }, now: deadline - 1 }), /not open/);
  assert.throws(() => assertCanSavePick({ ...input, selectedTeam: "FAKE", now: deadline - 1 }), /does not belong/);
});

test("one active entry is enforced while deleted generations remain preserved", () => {
  assertCanCreateEntry([]);
  assert.throws(() => assertCanCreateEntry([entry]), /already have an entry/);
  assertCanCreateEntry([{ ...entry, isDeleted: true }]);
  assert.equal(oneEntryId(season.id, entry.owner, 0), "entry-test26-r2-owner-a-0");
  assert.equal(oneEntryId(season.id, entry.owner, 1), "entry-test26-r2-owner-a-1");
});

test("visibility keeps other selections and tiebreakers private until their game starts", () => {
  const entries = [entry, { ...entry, id: "e2", owner: "owner-b", tieBreakerValue: 50 }];
  const picks = [
    { id: "p1", seasonId: season.id, entryId: "e1", gameId: "g1", owner: "owner-a", selectedTeam: "AAA" },
    { id: "p2", seasonId: season.id, entryId: "e2", gameId: "g1", owner: "owner-b", selectedTeam: "BBB" },
    { id: "p3", seasonId: season.id, entryId: "e2", gameId: "g2", owner: "owner-b", selectedTeam: "DDD" },
  ];
  const before = buildVisibleSeasonPicks({ entries, picks, games: [game, championship], config, identity: { sub: "owner-a" }, now: deadline - 1 });
  assert.deepEqual(before.picks.map((pick) => pick.id), ["p1"]);
  assert.deepEqual(before.tieBreakers, [{ entryId: "e1", value: 42 }]);
  assert.deepEqual(before.completeEntryIds, ["e2"]);
  assert.deepEqual(before.submissionCounts, [{ gameId: "g1", count: 2 }, { gameId: "g2", count: 1 }]);
  const forgedOwner = buildVisibleSeasonPicks({
    entries,
    picks: [{ ...picks[1], owner: "owner-a" }],
    games: [game, championship], config, identity: { sub: "owner-a" }, now: deadline - 1,
  });
  assert.deepEqual(forgedOwner.picks, []);
  const first = buildVisibleSeasonPicks({ entries, picks, games: [game, championship], config, identity: { sub: "owner-a" }, now: deadline });
  assert.deepEqual(first.picks.map((pick) => pick.id), ["p1", "p2"]);
  const after = buildVisibleSeasonPicks({ entries, picks, games: [game, championship], config, identity: { sub: "owner-a" }, now: deadline + 3600000 });
  assert.deepEqual(after.picks.map((pick) => pick.id), ["p1", "p2", "p3"]);
  assert.equal(after.tieBreakers.length, 2);
});

test("an early canceled or final status does not reveal selections before scheduled kickoff", () => {
  assert.equal(hasGameStarted({ ...game, status: "canceled" }, deadline - 1), false);
  assert.equal(hasGameStarted({ ...game, status: "final" }, deadline - 1), false);
  assert.equal(hasGameStarted({ ...game, status: "final" }, deadline), true);
});

test("the 54-game fixture has 48 player-pickable games", () => {
  const events = JSON.parse(readFileSync(new URL("../../../src/assets/mockBowls2026.json", import.meta.url))).events;
  const games = events.map((event, index) => ({ id: `g${index + 1}`, bowlName: event.competitions?.[0]?.notes?.[0]?.headline || event.competitions?.[0]?.name || event.name }));
  assert.equal(games.length, 54);
  assert.equal(pickableGames(games).length, 48);
});
