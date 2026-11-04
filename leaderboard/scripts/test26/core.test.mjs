import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyPlan,
  applyResetPlan,
  buildRecordPlan,
  buildSimulation,
  createDryRunPlan,
  createPlan,
  createResetPlan,
  GAME_MUTATION_FIELDS,
  prepareModelMutation,
  SEASON_CONFIG_MUTATION_FIELDS,
  serializeGameMutation,
  sourceEventIdFromStableGameId,
  validatePlanArtifact,
  verifyTarget,
} from "./core.mjs";
import { TEST26_TARGET } from "./target.mjs";
import { configureAmplifyForNode } from "./auth-session.mjs";

const mock = JSON.parse(
  await readFile(
    new URL("../../src/assets/mockBowls2026.json", import.meta.url),
    "utf8",
  ),
);
const deployedSeasonConfigModel = {
  fields: Object.fromEntries(
    SEASON_CONFIG_MUTATION_FIELDS.map((field) => [
      field,
      { type: field === "scoringConfigJson" ? "AWSJSON" : "String" },
    ]),
  ),
};
const startAt = "2026-08-01T12:00:00.000Z";
const simulation = () => buildSimulation({ events: mock.events, startAt });
const emptyState = () => ({
  seasonById: null,
  seasonsBySlug: [],
  seasonConfigs: [],
  games: [],
  entries: [],
  picks: [],
});

test("Node Auth configuration uses Amplify's in-memory fallback instead of SSR cookies", () => {
  const calls = [];
  configureAmplifyForNode({
    amplify: { configure: (...args) => calls.push(args) },
    outputs: { auth: { user_pool_id: "staging" } },
  });
  assert.deepEqual(calls, [[{ auth: { user_pool_id: "staging" } }]]);
});

test("default schedule opens for exactly 24 hours and locks at first kickoff", () => {
  const result = simulation();
  assert.equal(
    new Date(result.games[0].kickoffAt) -
      new Date(result.seasonConfig.picksOpenAt),
    24 * 60 * 60 * 1000,
  );
  assert.equal(result.seasonConfig.picksLockAt, result.games[0].kickoffAt);
  assert.equal(result.summary.deadlineMatchesEarliestKickoff, true);
});

test("all 54 stable game IDs are deterministic and kickoffs are strictly ordered", () => {
  const first = simulation();
  const second = simulation();
  assert.equal(first.games.length, 54);
  assert.deepEqual(
    first.games.map((game) => game.id),
    second.games.map((game) => game.id),
  );
  assert.equal(new Set(first.games.map((game) => game.id)).size, 54);
  for (let index = 1; index < first.games.length; index += 1) {
    assert.ok(first.games[index - 1].kickoffAt < first.games[index].kickoffAt);
  }
});

test("r2 reuses fixture metadata with isolated IDs and a future global lock", () => {
  const regressionStart = new Date(Date.now() + 3600000).toISOString();
  const first = buildSimulation({
    events: mock.events,
    startAt: regressionStart,
    seasonId: "test26-r2",
  });
  const second = buildSimulation({
    events: mock.events,
    startAt: regressionStart,
    seasonId: "test26-r2",
  });
  assert.deepEqual(first, second);
  assert.equal(first.season.isTestSeason, true);
  assert.equal(first.seasonConfig.seasonId, "test26-r2");
  assert.equal(first.games.length, 54);
  assert.equal(first.games[0].status, "scheduled");
  assert.equal(first.games[0].sourceEventId, "fixture-test26-r2-01");
  assert.equal(first.games[0].id, "game-test26-r2-fixture-test26-r2-01");
  assert.equal(first.games[0].teamALogo, simulation().games[0].teamALogo);
  assert.equal(
    first.games[0].teamBDisplayName,
    simulation().games[0].teamBDisplayName,
  );
  assert.equal(first.seasonConfig.picksLockAt, first.games[0].kickoffAt);
  assert.equal(new Set(first.games.map((game) => game.sourceEventId)).size, 54);
  assert.ok(
    first.games.every((game) =>
      game.sourceEventId.startsWith("fixture-test26-r2-"),
    ),
  );
  const plan = buildRecordPlan({ simulation: first, state: emptyState() });
  assert.equal(plan.counts.intendedMutations, 56);
  assert.equal(
    buildRecordPlan({
      simulation: first,
      state: {
        ...emptyState(),
        seasonById: first.season,
        seasonsBySlug: [first.season],
        seasonConfigs: [
          {
            ...first.seasonConfig,
            scoringConfigJson: JSON.parse(first.seasonConfig.scoringConfigJson),
          },
        ],
        games: first.games,
      },
    }).counts.intendedMutations,
    0,
  );
});

test("r2 refuses expired kickoff and unsupported season IDs", () => {
  assert.throws(
    () =>
      buildSimulation({
        events: mock.events,
        startAt: "2026-01-01T00:00:00Z",
        seasonId: "test26-r2",
      }),
    /future/,
  );
  assert.throws(
    () => buildSimulation({ events: mock.events, startAt, seasonId: "2026" }),
    /unsupported test season/,
  );
});

test("r2 reset preview isolates IDs and deletes children before their parents", async () => {
  const proposed = buildSimulation({
    events: mock.events,
    startAt: new Date(Date.now() + 3600000).toISOString(),
    seasonId: "test26-r2",
  });
  const state = {
    seasonById: proposed.season,
    seasonsBySlug: [proposed.season],
    seasonConfigs: [proposed.seasonConfig],
    games: proposed.games,
    entries: [{ id: "r2-entry" }],
    picks: [{ id: "r2-pick" }],
  };
  const plan = createResetPlan({ target: TEST26_TARGET, state });
  const deleted = [];
  const gateway = {
    delete: async (model, id) => deleted.push(`${model}:${id}`),
  };
  assert.equal(plan.conflicts.length, 0);
  assert.deepEqual(plan.ids.Season, ["test26-r2"]);
  await assert.rejects(
    applyResetPlan({
      gateway,
      plan,
      confirmation: "wrong",
      currentState: state,
    }),
    /confirmation/,
  );
  await assert.rejects(
    applyResetPlan({
      gateway,
      plan,
      confirmation: plan.confirmation,
      currentState: { ...state, picks: [] },
    }),
    /state changed/,
  );
  assert.deepEqual(deleted, []);
  const counts = await applyResetPlan({
    gateway,
    plan,
    confirmation: plan.confirmation,
    currentState: state,
  });
  assert.deepEqual(counts, {
    Pick: 1,
    Entry: 1,
    Game: 54,
    SeasonConfig: 1,
    Season: 1,
  });
  assert.equal(deleted[0], "Pick:r2-pick");
  assert.equal(deleted[1], "Entry:r2-entry");
  assert.equal(deleted.at(-1), "Season:test26-r2");
});

test("r2 reset refuses a mismatched season or fixture identity", () => {
  const state = {
    ...emptyState(),
    seasonById: { id: "test26", slug: "test26", isTestSeason: true },
    games: [{ id: "game-test26-1", seasonId: "test26", sourceEventId: "1" }],
  };
  const plan = createResetPlan({ target: TEST26_TARGET, state });
  assert.ok(plan.conflicts.length >= 2);
});

test("Game payload serialization keeps deployed mutation fields and drops unknown fields", () => {
  const proposed = simulation().games[0];
  const payload = serializeGameMutation(
    {
      ...proposed,
      sourceEventId: proposed.sourceEventId,
      browserOnlyValue: "nope",
    },
    GAME_MUTATION_FIELDS,
  );
  assert.equal(payload.sourceEventId, proposed.sourceEventId);
  assert.equal(payload.id, proposed.id);
  assert.equal("browserOnlyValue" in payload, false);
  assert.deepEqual(Object.keys(payload), GAME_MUTATION_FIELDS);
});

test("Game payload serialization rejects stale deployed model metadata", () => {
  assert.throws(
    () =>
      serializeGameMutation(
        simulation().games[0],
        GAME_MUTATION_FIELDS.filter((field) => field !== "sourceEventId"),
      ),
    /missing sourceEventId/,
  );
});

test("planned SeasonConfig passes through apply's deployed AWSJSON input preparation", () => {
  const planned = simulation().seasonConfig;
  const expected =
    '{"tieBreakerBowlName":"College Football Playoff National Championship Presented by AT&T"}';
  assert.equal(typeof planned.scoringConfigJson, "string");
  assert.equal(planned.scoringConfigJson, expected);

  const clientInput = prepareModelMutation(
    "SeasonConfig",
    planned,
    deployedSeasonConfigModel,
  );
  assert.equal(typeof clientInput.scoringConfigJson, "string");
  assert.equal(clientInput.scoringConfigJson, expected);
  assert.deepEqual(JSON.parse(clientInput.scoringConfigJson), {
    tieBreakerBowlName:
      "College Football Playoff National Championship Presented by AT&T",
  });
});

test("stable Game IDs protect the source-event identity independently of payload fields", () => {
  const proposed = simulation();
  const game = proposed.games[0];
  assert.equal(sourceEventIdFromStableGameId(game.id), game.sourceEventId);

  const plan = buildRecordPlan({
    simulation: proposed,
    state: {
      ...emptyState(),
      games: [{ ...game, sourceEventId: "different-source" }],
    },
  });
  assert.match(plan.conflicts.join(" "), /conflicting stable source identity/);
});

test("dry-run planning performs reads but no mutations", async () => {
  let reads = 0;
  let mutations = 0;
  const gateway = {
    readState: async () => {
      reads += 1;
      return emptyState();
    },
    create: async () => {
      mutations += 1;
    },
    update: async () => {
      mutations += 1;
    },
  };
  await createDryRunPlan({
    gateway,
    target: TEST26_TARGET,
    simulation: simulation(),
  });
  assert.equal(reads, 1);
  assert.equal(mutations, 0);
});

test("wrong API ID, app, or branch is rejected", () => {
  for (const [key, value] of [
    ["appSyncApiId", "wrong-api"],
    ["amplifyAppId", "wrong-app"],
    ["branch", "main"],
  ]) {
    assert.throws(
      () =>
        verifyTarget({
          expected: TEST26_TARGET,
          actual: { ...TEST26_TARGET, [key]: value },
        }),
      /Refusing target/,
    );
  }
});

test("apply without a valid dry-run plan is rejected before mutation", async () => {
  let mutations = 0;
  const gateway = {
    create: async () => {
      mutations += 1;
    },
    update: async () => {
      mutations += 1;
    },
  };
  await assert.rejects(
    applyPlan({
      gateway,
      plan: null,
      confirmation: "",
      currentState: emptyState(),
    }),
    /valid dry-run plan/,
  );
  assert.equal(mutations, 0);
});

test("existing entries or picks block a schedule replacement", () => {
  for (const statePatch of [
    { entries: [{ id: "entry-1" }] },
    { picks: [{ id: "pick-1" }] },
  ]) {
    const plan = buildRecordPlan({
      simulation: simulation(),
      state: { ...emptyState(), ...statePatch },
    });
    assert.match(plan.conflicts.join(" "), /blocks schedule replacement/);
  }
});

test("existing matching records are all skipped", () => {
  const proposed = simulation();
  const state = {
    ...emptyState(),
    seasonById: proposed.season,
    seasonsBySlug: [proposed.season],
    seasonConfigs: [proposed.seasonConfig],
    games: proposed.games,
  };
  const plan = buildRecordPlan({ simulation: proposed, state });
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.counts.intendedMutations, 0);
  assert.equal(plan.counts.games.skip, 54);
});

test("partial retry skips the matching Season and creates only config and games", () => {
  const proposed = simulation();
  const plan = buildRecordPlan({
    simulation: proposed,
    state: {
      ...emptyState(),
      seasonById: proposed.season,
      seasonsBySlug: [proposed.season],
    },
  });
  assert.equal(plan.conflicts.length, 0);
  assert.deepEqual(plan.counts.season, {
    create: 0,
    update: 0,
    skip: 1,
    conflict: 0,
  });
  assert.equal(plan.counts.seasonConfig.create, 1);
  assert.equal(plan.counts.games.create, 54);
  assert.equal(plan.counts.intendedMutations, 55);
});

test("duplicate season, config, and game records block execution", () => {
  const proposed = simulation();
  const state = {
    ...emptyState(),
    seasonsBySlug: [
      proposed.season,
      { ...proposed.season, id: "other-season" },
    ],
    seasonConfigs: [
      proposed.seasonConfig,
      { ...proposed.seasonConfig, id: "other-config" },
    ],
    games: [proposed.games[0], { ...proposed.games[0], id: "other-game" }],
  };
  const plan = createPlan({
    target: TEST26_TARGET,
    simulation: proposed,
    state,
  });
  assert.match(plan.records.conflicts.join(" "), /Multiple Season/);
  assert.match(plan.records.conflicts.join(" "), /Multiple SeasonConfig/);
  assert.match(
    plan.records.conflicts.join(" "),
    /Duplicate existing Game sourceEventId/,
  );
  assert.throws(
    () => validatePlanArtifact({ plan, confirmation: plan.confirmation }),
    /blocking conflicts/,
  );
});
