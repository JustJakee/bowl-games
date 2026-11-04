import assert from "node:assert/strict";
import test from "node:test";
import {
  __resetFbsTeamsCacheForTests,
  fetchFbsTeams,
  normalizeFbsTeams,
} from "./espn.js";

const responsePayload = {
  children: [
    {
      standings: {
        entries: [
          {
            team: {
              id: "333",
              displayName: "Alabama Crimson Tide",
              abbreviation: "ALA",
              location: "Alabama",
              name: "Crimson Tide",
              logos: [
                {
                  href: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
                  rel: ["full", "default"],
                },
              ],
            },
          },
          {
            team: {
              id: "12",
              displayName: "Arizona Wildcats",
              abbreviation: "ARIZ",
              logos: [],
            },
          },
        ],
      },
    },
    {
      standings: {
        entries: [
          {
            team: {
              id: "333",
              displayName: "Duplicate Alabama",
            },
          },
          { team: { id: "", displayName: "Invalid Team" } },
        ],
      },
    },
  ],
};

test("ESPN FBS teams normalize, deduplicate, and sort by stable ID", () => {
  assert.deepEqual(normalizeFbsTeams(responsePayload), [
    {
      id: "333",
      displayName: "Alabama Crimson Tide",
      abbreviation: "ALA",
      shortDisplayName: "",
      location: "Alabama",
      name: "Crimson Tide",
      logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png",
    },
    {
      id: "12",
      displayName: "Arizona Wildcats",
      abbreviation: "ARIZ",
      shortDisplayName: "",
      location: "",
      name: "",
      logo: "",
    },
  ]);
});

test("FBS team loader caches successful metadata and supports retry refresh", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => responsePayload,
    };
  };
  __resetFbsTeamsCacheForTests();

  try {
    const [first, second] = await Promise.all([
      fetchFbsTeams(),
      fetchFbsTeams(),
    ]);
    assert.equal(calls, 1);
    assert.strictEqual(first, second);
    await fetchFbsTeams({ force: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    __resetFbsTeamsCacheForTests();
  }
});

test("failed FBS loads clear the cache so retry can recover", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? { ok: false, status: 503 }
      : { ok: true, json: async () => responsePayload };
  };
  __resetFbsTeamsCacheForTests();

  try {
    await assert.rejects(fetchFbsTeams(), /503/);
    const teams = await fetchFbsTeams();
    assert.equal(calls, 2);
    assert.equal(teams.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    __resetFbsTeamsCacheForTests();
  }
});
