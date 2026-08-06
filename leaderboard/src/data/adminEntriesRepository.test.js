import assert from "node:assert/strict";
import test from "node:test";
import {
  __setAdminEntriesDataClientForTests,
  loadAdminEntries,
} from "./adminEntriesRepository.js";

test("admin entries uses the leaderboard's canonical entry for each player", async () => {
  const profile = { id: "profile-1", username: "Player", email: "player@example.com" };
  __setAdminEntriesDataClientForTests({
    models: {
      Entry: {
        list: async () => ({
          data: [
            { id: "old", seasonId: "season-1", entryName: "Entry 1", isDeleted: false, userProfile: profile, updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "current", seasonId: "season-1", entryName: "Entry 2", isDeleted: false, userProfile: profile, updatedAt: "2026-01-02T00:00:00.000Z" },
            { id: "deleted", seasonId: "season-1", entryName: "Old deleted", isDeleted: true, userProfile: { id: "profile-2" } },
          ],
        }),
      },
      Pick: {
        list: async () => ({
          data: [
            { id: "old-pick", entryId: "old", seasonId: "season-1", gameId: "game-1", selectedTeam: "AAA" },
            { id: "current-pick", entryId: "current", seasonId: "season-1", gameId: "game-1", selectedTeam: "BBB" },
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
    assert.deepEqual(rows.map((row) => row.id), ["current"]);
    assert.equal(rows[0].completedPicks, 1);
    assert.equal(rows[0].totalPicks, 2);
  } finally {
    __setAdminEntriesDataClientForTests(null);
  }
});
