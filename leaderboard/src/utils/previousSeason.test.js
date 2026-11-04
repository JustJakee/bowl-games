import assert from "node:assert/strict";
import test from "node:test";
import { choosePreviousSeason } from "./previousSeason.js";

test("previous results come from the latest completed earlier season", () => {
  const current = {
    id: "test26-r2",
    year: 2026,
    status: "open",
    isTestSeason: true,
  };
  assert.deepEqual(
    choosePreviousSeason(
      [
        { id: "current", year: 2026, status: "complete" },
        { id: "old", year: 2023, status: "archived" },
        { id: "draft", year: 2025, status: "draft" },
        { id: "previous", year: 2024, status: "complete" },
      ],
      current,
    ),
    { id: "previous", year: 2024, status: "complete" },
  );
  assert.equal(choosePreviousSeason([], current), null);
});
