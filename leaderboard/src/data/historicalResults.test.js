import assert from "node:assert/strict";
import test from "node:test";
import { legacyPreviousSeasonResults } from "./historicalResults.js";

test("existing 2025 podium remains available for a 2026 season only", () => {
  const historical = legacyPreviousSeasonResults({ year: 2026 });
  assert.equal(historical.season.year, 2025);
  assert.deepEqual(historical.winners.map((winner) => winner.name), ["Jeff Gumm", "David Newell", "Blythe", "Roll Tide!!!"]);
  assert.deepEqual(historical.winners.map((winner) => winner.tiebreakerMargin), [13, 19, 4, 8]);
  assert.equal(legacyPreviousSeasonResults({ year: 2027 }), null);
});
