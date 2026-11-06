import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { readFile } from "node:fs/promises";

// Execute the production handler with only Amplify initialization and network
// calls replaced. This verifies dispatch, authorization, pagination and writes.
const source = await readFile(new URL("./handler.js", import.meta.url), "utf8");
const client = { models: {} };
globalThis.__prizeContractClient = client;
const instrumented = source
  .replace('import { Amplify } from "aws-amplify";', 'const Amplify = { configure() {} };')
  .replace('import { generateClient } from "aws-amplify/data";', 'const generateClient = () => globalThis.__prizeContractClient;')
  .replace('import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";',
    'const getAmplifyDataClientConfig = async () => ({ resourceConfig: {}, libraryOptions: {} });')
  .replace('import { env } from "$amplify/env/prizes";', 'const env = {};')
  .replace('from "./rules.mjs";', `from "${new URL("./rules.mjs", import.meta.url).href}";`);
assert.notEqual(instrumented, source);
const { handler } = await import(`data:text/javascript;base64,${Buffer.from(instrumented).toString("base64")}`);
after(() => { delete globalThis.__prizeContractClient; });

const player = { sub: "player-1", groups: ["player"] };
const admin = { sub: "admin-1", groups: ["admin"] };
const tiers = JSON.stringify([
  { position: 1, percentageBasisPoints: 6000, label: "Champion" },
  { position: 2, percentageBasisPoints: 4000, label: "Runner up" },
]);
let payout;
let entries;
let season;
let writes;
let entryReads;

beforeEach(() => {
  payout = null;
  season = { id: "season-1", isActive: true };
  writes = [];
  entryReads = [];
  entries = [
    { id: "entry-1", owner: "owner-1", seasonId: "season-1", paymentStatus: "paid" },
    { id: "entry-2", owner: "owner-2", seasonId: "season-1", paymentStatus: "unpaid" },
  ];
  client.models = {
    Season: { get: async ({ id }, options) => {
      assert.equal(id, "season-1");
      assert.equal(options.authMode, "iam");
      return { data: season };
    } },
    SeasonPayout: {
      get: async ({ id }) => ({ data: id === "season-1" ? payout : null }),
      create: async (input) => {
        writes.push(["create", input]);
        payout = input;
        return { data: input };
      },
      update: async (input) => {
        writes.push(["update", input]);
        payout = input;
        return { data: input };
      },
    },
    Entry: { list: async (options) => {
      entryReads.push(options);
      assert.deepEqual(options.filter, { seasonId: { eq: "season-1" } });
      if (!options.nextToken) return { data: entries.slice(0, 1), nextToken: "page-2" };
      return { data: entries.slice(1), nextToken: null };
    } },
    Pick: { picksBySeason: async () => ({ data: [], nextToken: null }) },
  };
});

test("the player query pages server records but returns only the paid aggregate", async () => {
  const result = await handler({ fieldName: "prizePoolSummary", arguments: { seasonId: "season-1" }, identity: player });
  assert.deepEqual(result, {
    seasonId: "season-1", confirmedPaidEntryCount: 1,
    prizePoolCents: 500, payoutConfigJson: null,
  });
  assert.equal(entryReads.length, 2);
  assert.equal("entries" in result, false);
});

test("only an admin can publish and invalid input never reaches a write", async () => {
  await assert.rejects(handler({ fieldName: "publishSeasonPayouts", arguments: {
    seasonId: "season-1", payoutConfigJson: tiers,
  }, identity: player }), /Administrator/);
  await assert.rejects(handler({ fieldName: "publishSeasonPayouts", arguments: {
    seasonId: "season-1", payoutConfigJson: JSON.stringify([
      { position: 1, percentageBasisPoints: 9000 },
    ]),
  }, identity: admin }), /100%/);
  assert.deepEqual(writes, []);
});

test("admin publication creates then updates one season record", async () => {
  const event = { fieldName: "publishSeasonPayouts", arguments: {
    seasonId: "season-1", payoutConfigJson: tiers,
  }, identity: admin };
  assert.equal(await handler(event), tiers);
  assert.equal(await handler(event), tiers);
  assert.deepEqual(writes.map(([operation]) => operation), ["create", "update"]);
  assert.equal(writes[0][1].id, "season-1");
  assert.equal((await handler({ fieldName: "prizePoolSummary", arguments: {
    seasonId: "season-1",
  }, identity: player })).payoutConfigJson, tiers);
});

test("inactive seasons and unauthenticated readers are rejected before entry reads", async () => {
  season = { id: "season-1", isActive: false };
  await assert.rejects(handler({ fieldName: "prizePoolSummary", arguments: {
    seasonId: "season-1",
  }, identity: player }), /active season/);
  await assert.rejects(handler({ fieldName: "prizePoolSummary", arguments: {
    seasonId: "season-1",
  }, identity: { sub: "pending", groups: [] } }), /signed-in/);
  assert.deepEqual(entryReads, []);
});
