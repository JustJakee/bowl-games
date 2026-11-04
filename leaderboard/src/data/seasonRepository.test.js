import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setSeasonRepositoryDataClientForTests,
  listRawSeasonGames,
} from "./seasonRepository";
import { mapStoredGamesToDisplayGames } from "../utils/formatGameData";
import { selectPickableGames } from "../utils/scoreboardGames";
import {
  formatPicksDateKey,
  formatPicksDateLabel,
  formatPicksTimeLabel,
} from "../utils/picksGameUtils";

afterEach(() => __setSeasonRepositoryDataClientForTests(null));

test("season index pagination loads all 54 games and exposes 48 pickable games", async () => {
  const excluded = new Set([2, 4, 5, 17, 18, 51]);
  const games = Array.from({ length: 54 }, (_, index) => ({
    id: `fixture-${index + 1}`,
    seasonId: "test26-r2",
    gameNumber: index + 1,
    sortOrder: index + 1,
    bowlName: excluded.has(index + 1)
      ? "FCS Championship"
      : `Bowl ${index + 1}`,
    kickoffAt: new Date(
      Date.parse("2026-11-05T02:00:00Z") + index * 300000,
    ).toISOString(),
    status: "scheduled",
    teamAAbbr: "AAA",
    teamBAbbr: "BBB",
  }));
  const requests = [];
  __setSeasonRepositoryDataClientForTests({
    models: {
      Game: {
        gamesBySeason: async (key, options) => {
          requests.push({ key, options });
          const start = options.nextToken ? Number(options.nextToken) : 0;
          const page = games.slice(start, start + 31);
          return {
            data: page,
            nextToken:
              start + page.length < games.length
                ? String(start + page.length)
                : null,
          };
        },
      },
    },
  });

  const loaded = await listRawSeasonGames({ seasonId: "test26-r2" });
  const pickable = selectPickableGames(mapStoredGamesToDisplayGames(loaded));
  assert.equal(loaded.length, 54);
  assert.equal(pickable.length, 48);
  assert.deepEqual(
    requests.map((request) => request.options.nextToken),
    [undefined, "31"],
  );
  assert(requests.every((request) => request.key.seasonId === "test26-r2"));
  assert.equal(new Set(pickable.map((game) => game.id)).size, 48);
});

test("a failed later game page is an error, never a partial schedule", async () => {
  __setSeasonRepositoryDataClientForTests({
    models: {
      Game: {
        gamesBySeason: async (_key, options) =>
          options.nextToken
            ? { data: null, errors: [{ message: "Second page failed" }] }
            : {
                data: [{ id: "one", seasonId: "test26-r2" }],
                nextToken: "next",
              },
      },
    },
  });
  await assert.rejects(
    listRawSeasonGames({ seasonId: "test26-r2" }),
    /Second page failed/,
  );
});

test("Chicago grouping keeps midnight UTC fixtures on the correct local date", () => {
  assert.equal(formatPicksDateKey("2026-11-05T02:00:00Z"), "2026-11-04");
  assert.equal(formatPicksDateKey("2026-11-05T05:55:00Z"), "2026-11-04");
  assert.equal(formatPicksDateKey("2026-11-05T06:00:00Z"), "2026-11-05");
  assert.equal(
    formatPicksDateLabel("2026-11-05T02:00:00Z"),
    "November 4, 2026",
  );
  assert.match(formatPicksTimeLabel("2026-11-05T02:00:00Z"), /8:00 PM CST/);
});
