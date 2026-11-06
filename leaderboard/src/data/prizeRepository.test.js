import assert from "node:assert/strict";
import test from "node:test";
import {
  __setPrizeDataClientForTests,
  loadPrizeSummary,
  publishSeasonPayouts,
} from "./prizeRepository.js";

test("prize summary reads only the aggregate operation and verifies its amount", async () => {
  const calls = [];
  __setPrizeDataClientForTests({ queries: {
    prizePoolSummary: async (...args) => {
      calls.push(args);
      return { data: { seasonId: "season-1", confirmedPaidEntryCount: 2,
        prizePoolCents: 1000, payoutConfigJson: null } };
    },
  } });
  try {
    assert.equal((await loadPrizeSummary({ seasonId: "season-1" })).prizePoolCents, 1000);
    assert.deepEqual(calls[0], [{ seasonId: "season-1" }, { authMode: "userPool" }]);
  } finally {
    __setPrizeDataClientForTests(null);
  }
});

test("invalid aggregate responses and unconfirmed payout writes fail closed", async () => {
  __setPrizeDataClientForTests({
    queries: { prizePoolSummary: async () => ({ data: {
      seasonId: "season-1", confirmedPaidEntryCount: 2, prizePoolCents: 500,
    } }) },
    mutations: { publishSeasonPayouts: async () => ({ data: "unexpected" }) },
  });
  try {
    await assert.rejects(loadPrizeSummary({ seasonId: "season-1" }), /could not be verified/);
    await assert.rejects(publishSeasonPayouts({ seasonId: "season-1", tiers: [
      { position: 1, percentageBasisPoints: 10000 },
    ] }), /could not be confirmed/);
  } finally {
    __setPrizeDataClientForTests(null);
  }
});

test("payout publishing sends validated percentages, not paid totals", async () => {
  let input;
  __setPrizeDataClientForTests({ mutations: {
    publishSeasonPayouts: async (argumentsValue, options) => {
      input = { argumentsValue, options };
      return { data: argumentsValue.payoutConfigJson };
    },
  } });
  try {
    await publishSeasonPayouts({ seasonId: "season-1", tiers: [
      { position: 1, percentageBasisPoints: 10000, label: "Winner" },
    ] });
    assert.deepEqual(Object.keys(input.argumentsValue).sort(), ["payoutConfigJson", "seasonId"]);
    assert.deepEqual(input.options, { authMode: "userPool" });
    assert.equal(JSON.parse(input.argumentsValue.payoutConfigJson)[0].percentageBasisPoints, 10000);
  } finally {
    __setPrizeDataClientForTests(null);
  }
});
