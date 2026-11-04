import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./resource.ts", import.meta.url), "utf8");

test("favorite team is an owner-scoped account preference", () => {
  const favoriteTeamBlock = source.match(
    /favoriteTeamId: a[\s\S]*?(?=\/\/ Virtual one-to-many connection)/,
  )?.[0];

  assert.ok(favoriteTeamBlock, "favoriteTeamId field must exist");
  assert.match(favoriteTeamBlock, /ownerDefinedIn\("owner"\)/);
  assert.match(favoriteTeamBlock, /identityClaim\("sub"\)/);
  assert.match(favoriteTeamBlock, /\.to\(\["read", "update"\]\)/);
  assert.doesNotMatch(favoriteTeamBlock, /allow\.group\("player"\)/);
  assert.doesNotMatch(favoriteTeamBlock, /allow\.group\("admin"\)/);
});

test("favorite team remains separate from season Entry records", () => {
  const entryBlock = source.match(/Entry: a[\s\S]*?ArchivedSubmission:/)?.[0];
  assert.ok(entryBlock, "Entry model block must exist");
  assert.doesNotMatch(entryBlock, /favoriteTeamId/);
});
