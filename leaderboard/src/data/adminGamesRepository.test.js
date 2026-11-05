import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setAdminGamesDataClientForTests,
  loadAdminGames,
  updateAdminGame,
} from "./adminGamesRepository.js";

afterEach(() => __setAdminGamesDataClientForTests(null));

test("Admin pages through all 54 records and shows only 48 pickable games", async () => {
  const excluded = new Set([2, 4, 5, 17, 18, 51]);
  const games = Array.from({ length: 54 }, (_, index) => ({
    id: `game-${index + 1}`,
    seasonId: "test26-r2",
    bowlName: excluded.has(index + 1) ? "FCS Championship - Quarterfinals" : `Bowl ${index + 1}`,
    kickoffAt: new Date(Date.parse("2026-11-05T02:00:00Z") + index * 300000).toISOString(),
  }));
  const tokens = [];
  __setAdminGamesDataClientForTests({ models: { Game: {
    gamesBySeason: async (key, options) => {
      assert.equal(key.seasonId, "test26-r2");
      tokens.push(options.nextToken);
      const start = Number(options.nextToken || 0);
      const page = games.slice(start, start + 30);
      return {
        data: page,
        nextToken: start + page.length < games.length ? String(start + page.length) : null,
      };
    },
  } } });

  const loaded = await loadAdminGames({ seasonId: "test26-r2" });
  assert.equal(loaded.length, 48);
  assert(loaded.some((game) => game.id === "game-3"));
  assert(loaded.some((game) => game.id === "game-9"));
  assert(loaded.every((game) => !game.bowlName.includes("FCS Championship")));
  assert.deepEqual(tokens, [undefined, "30"]);
});

test("a refresh rereads persisted game changes", async () => {
  let stored = { id: "game-3", seasonId: "test26-r2", bowlName: "Army Navy Game", kickoffAt: "2026-11-05T02:10:00Z", status: "scheduled" };
  __setAdminGamesDataClientForTests({ models: { Game: {
    gamesBySeason: async () => ({ data: [{ ...stored }] }),
    update: async (input) => {
      stored = { ...stored, ...input };
      return { data: { ...stored } };
    },
  } } });

  assert.equal((await loadAdminGames({ seasonId: "test26-r2" }))[0].status, "scheduled");
  const saved = await updateAdminGame({ id: stored.id, status: "final", teamAScore: 31, teamBScore: 28, winnerTeam: "AAA" });
  assert.equal(saved.winnerTeam, "AAA");
  const refreshed = await loadAdminGames({ seasonId: "test26-r2" });
  assert.equal(refreshed[0].status, "final");
  assert.equal(refreshed[0].teamAScore, 31);
  assert.equal(refreshed[0].winnerTeam, "AAA");
});

test("a failed later page does not show an incomplete Admin game list", async () => {
  __setAdminGamesDataClientForTests({ models: { Game: {
    gamesBySeason: async (_key, options) => options.nextToken
      ? { errors: [{ message: "Second page failed" }] }
      : { data: [{ id: "game-1", seasonId: "test26-r2", bowlName: "First Bowl" }], nextToken: "next" },
  } } });
  await assert.rejects(loadAdminGames({ seasonId: "test26-r2" }), /Second page failed/);
});
