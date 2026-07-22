import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyPlan,
  buildRecordPlan,
  buildSimulation,
  createDryRunPlan,
  createPlan,
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
