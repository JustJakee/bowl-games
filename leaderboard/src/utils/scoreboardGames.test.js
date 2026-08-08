import assert from "node:assert/strict";
import test from "node:test";
import { selectTopScoreboardGames } from "./scoreboardGames";

const game = (id, status, startDate, statusText = "") => ({
  id,
  status,
  startDate,
  statusText,
});

test("top scoreboard prioritizes live games ahead of scheduled kickoff order", () => {
  const selected = selectTopScoreboardGames([
    game("scheduled-later", "scheduled", "2026-12-21T22:00:00Z"),
    game("live-later", "in_progress", "2026-12-21T22:00:00Z", "Q3 8:12"),
    game("scheduled-first", "scheduled", "2026-12-20T22:00:00Z"),
    game("live-first", "in_progress", "2026-12-20T22:00:00Z"),
  ]);
  assert.deepEqual(selected.map((item) => item.id), ["live-first", "live-later", "scheduled-first", "scheduled-later"]);
});

test("top scoreboard removes completed and canceled games", () => {
  const selected = selectTopScoreboardGames([
    game("final", "final", "2026-12-20T22:00:00Z"),
    game("canceled", "canceled", "2026-12-20T22:00:00Z"),
    game("scheduled", "scheduled", "2026-12-21T22:00:00Z"),
  ]);
  assert.deepEqual(selected.map((item) => item.id), ["scheduled"]);
});

test("a live game without period or clock remains in the scoreboard", () => {
  assert.deepEqual(
    selectTopScoreboardGames([game("live", "in_progress", "2026-12-20T22:00:00Z")]).map((item) => item.id),
    ["live"],
  );
});

test("all completed games produce an empty scoreboard collection", () => {
  assert.deepEqual(selectTopScoreboardGames([game("final", "final"), game("canceled", "canceled")]), []);
});
