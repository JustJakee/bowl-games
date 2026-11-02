import assert from "node:assert/strict";
import test, { beforeEach, afterEach, after, mock } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

// Execute the production handler and rules. Replace only initialization/network
// boundaries; all validation, pagination, writes and visibility logic stays real.
const root = fileURLToPath(new URL("../../../", import.meta.url));
await mkdir(path.join(root, "tmp"), { recursive: true });
const directory = await mkdtemp(path.join(root, "tmp", "secure-picks-contract-"));
after(async () => {
  delete globalThis.__securePicksContractClient;
  await rm(directory, { recursive: true, force: true });
});
const client = { models: {} };
globalThis.__securePicksContractClient = client;
const result = await build({
  entryPoints: [path.join(root, "amplify/data/secure-picks/handler.js")],
  outfile: path.join(directory, "handler.mjs"), bundle: true, write: false,
  platform: "node", format: "esm", packages: "external",
  plugins: [{ name: "secure-picks-network-boundaries", setup(builder) {
    builder.onResolve({ filter: /^(aws-amplify(?:\/data)?|@aws-amplify\/backend\/function\/runtime|\$amplify\/env\/secure-picks)$/ },
      ({ path: name }) => ({ path: name, namespace: "boundary" }));
    builder.onLoad({ filter: /.*/, namespace: "boundary" }, ({ path: name }) => ({ contents:
      name === "aws-amplify" ? "export const Amplify = { configure() {} };" :
      name === "aws-amplify/data" ? "export const generateClient = () => globalThis.__securePicksContractClient;" :
      name.startsWith("$amplify") ? "export const env = {};" :
      "export const getAmplifyDataClientConfig = async () => ({ resourceConfig: {}, libraryOptions: {} });",
    }));
  } }],
});
await writeFile(path.join(directory, "handler.mjs"), result.outputFiles[0].contents);
const { handler } = await import(pathToFileURL(path.join(directory, "handler.mjs")).href);

const PLAYER = { sub: "player-one", groups: ["player"], claims: { "cognito:groups": ["player"] } };
const start = Date.parse("2030-01-01T00:00:00Z");
const iso = (offset) => new Date(start + offset).toISOString();
const argsByField = {
  createSeasonEntry: { seasonId: "season", entryName: "My picks", contactEmail: "player@example.com", userProfileId: "profile" },
  updateSeasonEntry: { entryId: "entry-one", entryName: "New name", tieBreakerValue: 42 },
  saveSeasonPick: { entryId: "entry-one", gameId: "game-one", selectedTeam: "AAA" },
  visibleSeasonPicks: { seasonId: "season" },
};

// Preflight supplies a template per operation, resolved from the synthesized
// AppSync pipeline. Substitute known JSON ctx expressions, never invent action.
const event = (fieldName, args = argsByField[fieldName] || {}, identity = PLAYER) => {
  const ctx = { typeName: fieldName === "visibleSeasonPicks" ? "Query" : "Mutation",
    fieldName, arguments: args, identity, source: null, request: { headers: {} }, prev: null };
  const templates = JSON.parse(process.env.SECURE_PICKS_REQUEST_TEMPLATES || "{}");
  if (!templates[fieldName]) {
    if (process.env.SECURE_PICKS_REQUEST_TEMPLATES && Object.hasOwn(argsByField, fieldName))
      assert.fail(`Missing generated payload for ${fieldName}`);
    return ctx;
  }
  const rendered = templates[fieldName].replace(/^\s*##.*$/gm, "")
    .replace(/\$util\.toJson\(\$ctx\.stash\.get\("(typeName|fieldName)"\)\)/g, (_, key) => JSON.stringify(ctx[key]))
    .replace(/\$util\.toJson\(\$ctx\.(arguments|identity|source|request|prev)\)/g, (_, key) => JSON.stringify(ctx[key]));
  const request = JSON.parse(rendered);
  assert.equal(request.operation, "Invoke");
  assert.deepEqual(request.payload, ctx);
  return request.payload;
};

let now, season, config, games, entries, picks, reads, writes;
beforeEach(() => {
  now = start;
  mock.method(Date, "now", () => now);
  season = { id: "season", status: "open", isActive: true };
  config = { id: "config", seasonId: "season", picksOpenAt: iso(-3600000), picksLockAt: iso(3600000), tieBreakerRequired: true };
  games = [
    { id: "game-one", seasonId: "season", bowlName: "Test Bowl", kickoffAt: iso(3600000), status: "scheduled", teamAAbbr: "AAA", teamBAbbr: "BBB" },
    { id: "championship", seasonId: "season", bowlName: "College Football Playoff National Championship Presented by AT&T", kickoffAt: iso(7200000), status: "scheduled", teamAAbbr: "AAA", teamBAbbr: "BBB" },
  ];
  entries = [
    { id: "entry-one", seasonId: "season", owner: PLAYER.sub, entryName: "My picks", entryNameKey: "my picks", isDeleted: false, tieBreakerValue: 42 },
    { id: "entry-two", seasonId: "season", owner: "player-two", entryName: "Other picks", isDeleted: false, tieBreakerValue: 51 },
  ];
  picks = [];
  reads = []; writes = [];
  const read = (label, fn) => async (input, options = input) => {
    assert.equal(options.authMode, "iam"); reads.push(label); return { data: fn(input) };
  };
  const write = (model, operation) => async (input, options) => {
    assert.equal(options.authMode, "iam"); writes.push({ model, operation, input });
    const rows = model === "Entry" ? entries : picks;
    const existing = rows.find((row) => row.id === input.id);
    if (operation === "create") { assert.equal(existing, undefined); rows.push({ ...input }); }
    else { assert(existing); Object.assign(existing, input); }
    return { data: rows.find((row) => row.id === input.id) };
  };
  client.models = {
    Season: { get: read("Season.get", () => season) },
    SeasonConfig: { seasonConfigBySeasonId: read("SeasonConfig.index", () => [config]) },
    Game: { gamesBySeason: read("Game.index", () => games) },
    UserProfile: { get: read("UserProfile.get", () => ({ id: "profile", owner: PLAYER.sub })) },
    Entry: {
      get: read("Entry.get", ({ id }) => entries.find((entry) => entry.id === id)),
      list: read("Entry.list", ({ filter }) => entries.filter((entry) => !filter?.owner || entry.owner === filter.owner.eq)),
      create: write("Entry", "create"), update: write("Entry", "update"),
    },
    Pick: {
      pickByEntryAndGame: read("Pick.entryIndex", ({ entryId }) => picks.filter((pick) => pick.entryId === entryId)),
      picksBySeason: read("Pick.seasonIndex", () => picks),
      create: write("Pick", "create"), update: write("Pick", "update"),
    },
  };
});
afterEach(() => mock.restoreAll());

test("createSeasonEntry dispatches generated arguments, derives owner, and keeps one active entry", async () => {
  entries = [];
  const created = await handler(event("createSeasonEntry"));
  assert.equal(created.id, "entry-season-player-one-0");
  assert.equal(created.owner, PLAYER.sub);
  assert.equal(created.userProfileId, "profile");
  assert.equal(created.entryName, "My picks");
  await assert.rejects(handler(event("createSeasonEntry")), /already have an entry/);
  assert.equal(writes.length, 1);
});

test("updateSeasonEntry dispatches arguments and preserves immutable ownership/payment", async () => {
  const updated = await handler(event("updateSeasonEntry", { ...argsByField.updateSeasonEntry, owner: "forged", paymentStatus: "paid" }));
  assert.equal(updated.entryName, "New name");
  assert.equal(updated.tieBreakerValue, 42);
  assert.equal(updated.owner, PLAYER.sub);
  assert.deepEqual(writes[0].input, { id: "entry-one", entryName: "New name", entryNameKey: "new name", tieBreakerValue: 42 });
});

test("saveSeasonPick dispatches create/update/deselection with persisted owner and deterministic ID", async () => {
  const first = await handler(event("saveSeasonPick"));
  assert.equal(first.id, "pick-entry-one-game-one");
  assert.equal(first.owner, PLAYER.sub);
  await handler(event("saveSeasonPick", { ...argsByField.saveSeasonPick, selectedTeam: "BBB" }));
  await handler(event("saveSeasonPick", { ...argsByField.saveSeasonPick, selectedTeam: "" }));
  assert.equal(picks.length, 1);
  assert.equal(picks[0].selectedTeam, "");
  assert.deepEqual(writes.map(({ operation }) => operation), ["create", "update", "update"]);
});

test("visibleSeasonPicks dispatch preserves pre-kickoff privacy and reveals each game/tiebreaker at kickoff", async () => {
  picks = entries.flatMap((entry) => games.map((game) => ({
    id: `pick-${entry.id}-${game.id}`, entryId: entry.id, seasonId: "season", gameId: game.id, owner: entry.owner, selectedTeam: "AAA",
  })));
  const before = await handler(event("visibleSeasonPicks"));
  assert.equal(before.picks.length, 2);
  assert(before.picks.every((pick) => pick.entryId === "entry-one" && !("owner" in pick)));
  assert.deepEqual(before.completeEntryIds, ["entry-one", "entry-two"]);
  assert.deepEqual(before.tieBreakers, [{ entryId: "entry-one", value: 42 }]);
  assert.deepEqual(before.submissionCounts, [{ gameId: "game-one", count: 2 }, { gameId: "championship", count: 2 }]);
  now = start + 3600000;
  assert.equal((await handler(event("visibleSeasonPicks"))).picks.length, 3);
  now = start + 7200000;
  const after = await handler(event("visibleSeasonPicks"));
  assert.equal(after.picks.length, 4);
  assert.equal(after.tieBreakers.length, 2);
  assert.equal(writes.length, 0);
});

for (const field of Object.keys(argsByField)) {
  test(`${field} rejects an anonymous generated request without writes`, async () => {
    await assert.rejects(handler(event(field, argsByField[field], null)), /signed-in player/);
    assert.equal(writes.length, 0);
  });
}

for (const field of ["createSeasonEntry", "updateSeasonEntry", "saveSeasonPick"]) {
  test(`${field} keeps player-group checks, admin exclusion, opening time and server locking`, async () => {
    for (const identity of [{ sub: "pending", groups: [] }, { sub: PLAYER.sub, groups: ["player", "admin"] }])
      await assert.rejects(handler(event(field, argsByField[field], identity)), /Only player accounts/);
    now = start - 7200000;
    await assert.rejects(handler(event(field)), /not open yet/);
    now = start + 3600000;
    await assert.rejects(handler(event(field)), /locked/);
    config.picksLockAt = iso(10800000); // Earliest kickoff must still tighten it.
    await assert.rejects(handler(event(field)), /locked/);
    assert.equal(writes.length, 0);
  });
}

test("update/save reject foreign or deleted entries; save rejects a foreign game or team", async () => {
  for (const field of ["updateSeasonEntry", "saveSeasonPick"]) {
    await assert.rejects(handler(event(field, { ...argsByField[field], entryId: "entry-two" })), /another player's entry/);
    entries[0].isDeleted = true;
    await assert.rejects(handler(event(field)), /not found/);
    entries[0].isDeleted = false;
  }
  await assert.rejects(handler(event("saveSeasonPick", { ...argsByField.saveSeasonPick, gameId: "foreign-game" })), /does not belong/);
  await assert.rejects(handler(event("saveSeasonPick", { ...argsByField.saveSeasonPick, selectedTeam: "FORGED" })), /does not belong/);
  assert.equal(writes.length, 0);
});

test("unknown/missing/nested-info/action operations fail closed before any model access", async () => {
  for (const request of [event("unknown"), { identity: PLAYER }, { identity: PLAYER, info: { fieldName: "saveSeasonPick" } },
    { identity: PLAYER, action: "saveSeasonPick", arguments: argsByField.saveSeasonPick }])
    await assert.rejects(handler(request), /Unsupported pick operation/);
  assert.equal(reads.length, 0);
  assert.equal(writes.length, 0);
});
