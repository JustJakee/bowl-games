import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSimulation, REGRESSION_SEASON_ID } from "../../scripts/test26/core.mjs";
import { getSeasonExperience, shouldShowSeasonPending } from "./seasonExperience.js";

const mock = JSON.parse(readFileSync(new URL("../assets/mockBowls2026.json", import.meta.url), "utf8"));
const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const fixture = buildSimulation({ events: mock.events, startAt, seasonId: REGRESSION_SEASON_ID });
const input = (now, games = fixture.games, season = fixture.season) => ({ season, seasonConfig: fixture.seasonConfig, games, now });
const opensAt = Date.parse(fixture.seasonConfig.picksOpenAt);
const locksAt = Date.parse(fixture.seasonConfig.picksLockAt);

test("test26-r2 moves through Pending, Picks Open, Locked, In Progress, and Final", () => {
  assert.equal(fixture.games.length, 54);
  assert.equal(fixture.season.isTestSeason, true);
  assert.equal(getSeasonExperience(input(opensAt - 1)), "pending");
  assert.equal(getSeasonExperience(input(opensAt)), "picksOpen");
  assert.equal(getSeasonExperience(input(locksAt - 1)), "picksOpen");
  assert.equal(getSeasonExperience(input(locksAt)), "locked");
  assert.equal(getSeasonExperience(input(locksAt + 1, [{ ...fixture.games[0], status: "final" }, ...fixture.games.slice(1)])), "inProgress");
  assert.equal(getSeasonExperience(input(locksAt + 1, fixture.games.map((game) => ({ ...game, status: "final" })))), "final");
});

test("pending never masks an open test season or an admin-controlled locked state", () => {
  assert.equal(shouldShowSeasonPending(input(opensAt)), false);
  assert.equal(shouldShowSeasonPending(input(locksAt + 1, fixture.games, { ...fixture.season, status: "locked" })), false);
  assert.equal(shouldShowSeasonPending(input(opensAt + 1, fixture.games, { ...fixture.season, status: "draft" })), true);
  assert.equal(getSeasonExperience({ season: fixture.season, seasonConfig: null }), "unavailable");
});
