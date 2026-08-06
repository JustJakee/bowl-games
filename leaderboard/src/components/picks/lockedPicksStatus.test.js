import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLockedPickItems,
  getPickDisplayStatus,
  getPickStatusCounts,
  groupLockedPickItems,
} from "./lockedPicksStatus";

const game = (overrides = {}) => ({
  id: "game-1",
  state: "pre",
  startDate: "2026-12-20T18:00:00.000Z",
  away: { abbr: "AWY", displayName: "Away Team", score: "" },
  home: { abbr: "HME", displayName: "Home Team", score: "" },
  ...overrides,
});

test("locked pick statuses use actual game state and winner data", () => {
  assert.equal(getPickDisplayStatus(game({ state: "post", isFinal: true, winnerTeam: "AWY" }), "AWY"), "correct");
  assert.equal(getPickDisplayStatus(game({ state: "post", isFinal: true, winnerTeam: "AWY" }), "HME"), "incorrect");
  assert.equal(getPickDisplayStatus(game({ state: "in" }), "AWY"), "live");
  assert.equal(getPickDisplayStatus(game(), "AWY"), "upcoming");
  assert.equal(getPickDisplayStatus(game({ state: "post", statusText: "Canceled" }), "AWY"), "canceled");
  assert.equal(getPickDisplayStatus(game({ statusText: "Postponed" }), "AWY"), "postponed");
});

test("summary counts and grouped filters share the same derived items", () => {
  const games = [
    game({ id: "correct", state: "post", isFinal: true, winnerTeam: "AWY" }),
    game({ id: "incorrect", state: "post", isFinal: true, winnerTeam: "HME" }),
    game({ id: "live", state: "in" }),
    game({ id: "upcoming", startDate: "2026-12-21T18:00:00.000Z" }),
  ];
  const items = buildLockedPickItems({
    games,
    selectionsByGameId: Object.fromEntries(games.map((item) => [item.id, "AWY"])),
  });
  assert.deepEqual(getPickStatusCounts(items), {
    correct: 1, incorrect: 1, live: 1, upcoming: 1, canceled: 0, postponed: 0,
  });
  assert.deepEqual(groupLockedPickItems(items, "all").map((section) => section.status), ["live", "correct", "incorrect", "upcoming"]);
  assert.deepEqual(groupLockedPickItems(items, "incorrect")[0].items.map((item) => item.id), ["incorrect"]);
});

test("missing selections and logos do not create invalid pick rows", () => {
  const items = buildLockedPickItems({ games: [game({ away: { abbr: "AWY" } })], selectionsByGameId: {} });
  assert.deepEqual(items, []);
});
