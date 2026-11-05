import assert from "node:assert/strict";
import test from "node:test";
import {
  __setAdminEntriesDataClientForTests,
  loadAdminEntries,
  updateAdminEntryPayment,
} from "./adminEntriesRepository.js";

test("admin entries uses the leaderboard's canonical entry for each player", async () => {
  const profile = {
    id: "profile-1",
    username: "Player",
    email: "player@example.com",
  };
  __setAdminEntriesDataClientForTests({
    models: {
      Entry: {
        list: async () => ({
          data: [
            {
              id: "old",
              seasonId: "season-1",
              entryName: "Entry 1",
              isDeleted: false,
              userProfile: profile,
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "current",
              seasonId: "season-1",
              entryName: "Entry 2",
              isDeleted: false,
              userProfile: profile,
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
            {
              id: "deleted",
              seasonId: "season-1",
              entryName: "Old deleted",
              isDeleted: true,
              userProfile: { id: "profile-2" },
            },
          ],
        }),
      },
      Pick: {
        list: async () => ({
          data: [
            {
              id: "old-pick",
              entryId: "old",
              seasonId: "season-1",
              gameId: "game-1",
              selectedTeam: "AAA",
            },
            {
              id: "current-pick",
              entryId: "current",
              seasonId: "season-1",
              gameId: "game-1",
              selectedTeam: "BBB",
            },
          ],
        }),
      },
    },
  });

  try {
    const rows = await loadAdminEntries({
      seasonId: "season-1",
      requiredGameIds: ["game-1", "game-2"],
    });
    assert.deepEqual(
      rows.map((row) => row.id),
      ["current"],
    );
    assert.equal(rows[0].completedPicks, 1);
    assert.equal(rows[0].totalPicks, 2);
  } finally {
    __setAdminEntriesDataClientForTests(null);
  }
});

test("payment update confirms only the intended entry and returns its saved status", async () => {
  const calls = [];
  __setAdminEntriesDataClientForTests({ models: { Entry: {
    update: async (input, options) => { calls.push({ input, options }); return { data: { id: input.id, paymentStatus: input.paymentStatus } }; },
    get: async () => { throw new Error("A confirmed mutation needs no second read."); },
  } } });
  try {
    assert.deepEqual(await updateAdminEntryPayment({ entryId: "entry-one", paymentStatus: "paid" }), { id: "entry-one", paymentStatus: "paid" });
    assert.deepEqual(calls[0].input, { id: "entry-one", paymentStatus: "paid" });
    assert.deepEqual(calls[0].options.selectionSet, ["id", "paymentStatus"]);
  } finally { __setAdminEntriesDataClientForTests(null); }
});

test("ambiguous payment response is reconciled with persisted status", async () => {
  __setAdminEntriesDataClientForTests({ models: { Entry: {
    update: async () => ({ errors: [{ message: "Related profile failed" }] }),
    get: async () => ({ data: { id: "entry-one", paymentStatus: "unpaid" } }),
  } } });
  try {
    assert.deepEqual(await updateAdminEntryPayment({ entryId: "entry-one", paymentStatus: "unpaid" }), { id: "entry-one", paymentStatus: "unpaid" });
  } finally { __setAdminEntriesDataClientForTests(null); }
});

test("failed payment write and failed reconciliation are never reported as saved", async () => {
  for (const get of [
    async () => ({ data: { id: "entry-one", paymentStatus: "unpaid" } }),
    async () => { throw new Error("Refresh failed"); },
  ]) {
    __setAdminEntriesDataClientForTests({ models: { Entry: {
      update: async () => ({ errors: [{ message: "Write rejected" }] }),
      get,
    } } });
    await assert.rejects(updateAdminEntryPayment({ entryId: "entry-one", paymentStatus: "paid" }), /Write rejected/);
  }
  __setAdminEntriesDataClientForTests(null);
});
