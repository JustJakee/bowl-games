import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import {
  applyPlan,
  buildSimulation,
  createDryRunPlan,
  hashValue,
  prepareModelMutation,
  validatePlanArtifact,
  verifyTarget,
} from "./core.mjs";
import {
  DEFAULT_AWS_PROFILE,
  ISOLATED_OUTPUTS_PATH,
  PLAN_PATH,
  TEST26_TARGET,
} from "./target.mjs";
import { configureAmplifyForNode } from "./auth-session.mjs";

const MODEL_FIELDS = {
  Season: ["id", "year", "name", "slug", "status", "entryFeeCents", "isActive"],
  SeasonConfig: [
    "id",
    "seasonId",
    "picksOpenAt",
    "picksLockAt",
    "maxEntriesPerUser",
    "tieBreakerLabel",
    "tieBreakerRequired",
    "scoringConfigJson",
  ],
  Game: [
    "id",
    "seasonId",
    "sourceEventId",
    "gameNumber",
    "sortOrder",
    "bowlName",
    "gameName",
    "network",
    "status",
    "statusDetail",
    "teamA",
    "teamADisplayName",
    "teamAAbbr",
    "teamALogo",
    "teamAColor",
    "teamAAlternateColor",
    "teamARank",
    "teamAScore",
    "teamB",
    "teamBDisplayName",
    "teamBAbbr",
    "teamBLogo",
    "teamBColor",
    "teamBAlternateColor",
    "teamBRank",
    "teamBScore",
    "kickoffAt",
    "neutralSite",
    "venueName",
    "location",
    "winnerTeam",
  ],
};

const parseArgs = (argv) => {
  const options = { mode: argv[0] };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--"))
      throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for --${key}.`);
    options[key] = value;
    index += 1;
  }
  return options;
};

const awsJson = (args, profile) =>
  JSON.parse(
    execFileSync(
      "aws",
      [
        ...args,
        "--profile",
        profile,
        "--region",
        TEST26_TARGET.region,
        "--output",
        "json",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    ),
  );

const loadAndVerifyTarget = async ({ profile, outputsPath }) => {
  const outputs = JSON.parse(await readFile(outputsPath, "utf8"));
  const modelIntrospection = outputs?.data?.model_introspection;
  const gameFieldNames = Object.keys(
    modelIntrospection?.models?.Game?.fields || {},
  );
  // This validates the local client metadata before authentication or any backend write.
  prepareModelMutation("Game", {}, modelIntrospection?.models?.Game);
  prepareModelMutation(
    "SeasonConfig",
    { scoringConfigJson: {} },
    modelIntrospection?.models?.SeasonConfig,
  );
  const identity = awsJson(["sts", "get-caller-identity"], profile);
  const app = awsJson(
    ["amplify", "get-app", "--app-id", TEST26_TARGET.amplifyAppId],
    profile,
  ).app;
  const branch = awsJson(
    [
      "amplify",
      "get-branch",
      "--app-id",
      TEST26_TARGET.amplifyAppId,
      "--branch-name",
      TEST26_TARGET.branch,
    ],
    profile,
  ).branch;
  const endpoint = outputs?.data?.url || "";
  const matchingApis = (
    awsJson(["appsync", "list-graphql-apis"], profile).graphqlApis || []
  ).filter((api) => api?.uris?.GRAPHQL === endpoint);
  if (matchingApis.length !== 1) {
    throw new Error(
      `Refusing target: expected exactly one AppSync API for ${endpoint}; found ${matchingApis.length}.`,
    );
  }
  const appSyncApi = matchingApis[0];
  const actual = {
    accountId: identity.Account,
    region: outputs?.data?.aws_region,
    amplifyAppId: app?.appId,
    branch: branch?.branchName,
    backendStackName:
      String(branch?.backend?.stackArn || "").split("/")[1] || "",
    appSyncApiId: appSyncApi.apiId,
    appSyncEndpointId: endpoint ? new URL(endpoint).hostname.split(".")[0] : "",
    appSyncEndpoint: endpoint,
    userPoolId: outputs?.auth?.user_pool_id,
    userPoolClientId: outputs?.auth?.user_pool_client_id,
    identityPoolId: outputs?.auth?.identity_pool_id,
    modelIntrospectionHash: hashValue(modelIntrospection),
  };
  verifyTarget({ expected: TEST26_TARGET, actual });
  return { outputs, actual, modelIntrospection };
};

const throwForErrors = (result, operation) => {
  if (result?.errors?.length) {
    throw new Error(
      `${operation}: ${result.errors.map((error) => error.message).join("; ")}`,
    );
  }
  if (!result) throw new Error(`${operation}: no response.`);
};

const paginate = async (operation, label) => {
  const records = [];
  let nextToken;
  do {
    const result = await operation(nextToken);
    throwForErrors(result, label);
    records.push(...(result.data || []).filter(Boolean));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return records.sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  );
};

const createGateway = (client, modelIntrospection) => {
  const gameFieldNames = Object.keys(modelIntrospection.models.Game.fields);
  const deployedGameFields = new Set(gameFieldNames);
  const gameSelection = MODEL_FIELDS.Game.filter((field) =>
    deployedGameFields.has(field),
  );
  return {
    async readState() {
      const seasonResult = await client.models.Season.get(
        { id: "test26" },
        { selectionSet: MODEL_FIELDS.Season, authMode: "userPool" },
      );
      throwForErrors(seasonResult, "Get Season test26");
      const [seasonsBySlug, seasonConfigs, games, entries, picks] =
        await Promise.all([
          paginate(
            (nextToken) =>
              client.models.Season.seasonBySlug(
                { slug: "test26" },
                {
                  limit: 100,
                  nextToken,
                  selectionSet: MODEL_FIELDS.Season,
                  authMode: "userPool",
                },
              ),
            "List Seasons by slug",
          ),
          paginate(
            (nextToken) =>
              client.models.SeasonConfig.seasonConfigBySeasonId(
                { seasonId: "test26" },
                {
                  limit: 100,
                  nextToken,
                  selectionSet: MODEL_FIELDS.SeasonConfig,
                  authMode: "userPool",
                },
              ),
            "List SeasonConfig records",
          ),
          paginate(
            (nextToken) =>
              client.models.Game.gamesBySeason(
                { seasonId: "test26" },
                {
                  limit: 100,
                  nextToken,
                  selectionSet: gameSelection,
                  authMode: "userPool",
                },
              ),
            "List Games",
          ),
          paginate(
            (nextToken) =>
              client.models.Entry.list({
                filter: { seasonId: { eq: "test26" } },
                limit: 100,
                nextToken,
                selectionSet: ["id"],
                authMode: "userPool",
              }),
            "Count Entries",
          ),
          paginate(
            (nextToken) =>
              client.models.Pick.picksBySeason(
                { seasonId: "test26" },
                {
                  limit: 100,
                  nextToken,
                  selectionSet: ["id"],
                  authMode: "userPool",
                },
              ),
            "Count Picks",
          ),
        ]);
      return {
        seasonById: seasonResult.data || null,
        seasonsBySlug,
        seasonConfigs,
        games,
        entries,
        picks,
      };
    },
    async create(model, record) {
      const payload = prepareModelMutation(
        model,
        record,
        modelIntrospection.models[model],
      );
      const result = await client.models[model].create(payload, {
        authMode: "userPool",
      });
      throwForErrors(result, `Create ${model}`);
    },
    async update(model, record) {
      const payload = prepareModelMutation(
        model,
        record,
        modelIntrospection.models[model],
      );
      const result = await client.models[model].update(payload, {
        authMode: "userPool",
      });
      throwForErrors(result, `Update ${model}`);
    },
  };
};

const authenticateAdmin = async (outputs) => {
  const username = process.env.TEST26_ADMIN_EMAIL;
  const password = process.env.TEST26_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Set TEST26_ADMIN_EMAIL and TEST26_ADMIN_PASSWORD for a staging admin account.",
    );
  }
  configureAmplifyForNode({ amplify: Amplify, outputs });
  const result = await signIn({ username, password });
  if (!result.isSignedIn)
    throw new Error(
      `Admin sign-in requires step: ${result.nextStep?.signInStep || "unknown"}.`,
    );
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken?.payload?.["cognito:groups"] || [];
  if (!groups.includes("admin"))
    throw new Error("The Cognito account is not in the staging admin group.");
  return generateClient();
};

const printReport = (plan) => {
  const { target, simulation, records } = plan;
  console.log("\nTarget");
  console.table({
    account: target.accountId,
    region: target.region,
    amplifyApp: target.amplifyAppId,
    branch: target.branch,
    appSyncApi: target.appSyncApiId,
    endpoint: target.appSyncEndpoint,
    cognitoPool: target.userPoolId,
    cognitoClient: target.userPoolClientId,
    identityPool: target.identityPoolId,
  });
  console.log("\nSimulation");
  console.table({
    start: simulation.summary.picksOpenAt,
    picksOpen: simulation.summary.picksOpenAt,
    globalDeadline: simulation.summary.picksLockAt,
    earliestGame: `${simulation.summary.earliestGameId} @ ${simulation.summary.earliestKickoffAt}`,
    latestGame: `${simulation.summary.latestGameId} @ ${simulation.summary.latestKickoffAt}`,
    intervalMinutes: simulation.options.gameIntervalMinutes,
    durationMinutes: simulation.summary.totalDurationMinutes,
    deadlineEqualsFirstKickoff:
      simulation.summary.deadlineMatchesEarliestKickoff,
  });
  console.log("\nRecord plan");
  console.table({
    season: records.counts.season,
    seasonConfig: records.counts.seasonConfig,
    games: records.counts.games,
  });
  console.log({
    existingEntries: records.counts.existingEntries,
    existingPicks: records.counts.existingPicks,
    intendedMutations: records.counts.intendedMutations,
    unmanagedGames: records.counts.unmanagedGames,
    conflicts: records.conflicts,
  });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!["dry-run", "apply"].includes(args.mode)) {
    throw new Error("Use either dry-run or apply mode.");
  }
  const profile = args.profile || DEFAULT_AWS_PROFILE;
  if (args.outputs) {
    throw new Error(
      `--outputs is disabled; use the isolated deployed output at ${ISOLATED_OUTPUTS_PATH}.`,
    );
  }
  const outputsPath = path.resolve(ISOLATED_OUTPUTS_PATH);
  const planPath = path.resolve(args.plan || PLAN_PATH);
  const { outputs, modelIntrospection } = await loadAndVerifyTarget({
    profile,
    outputsPath,
  });
  let client;
  try {
    client = await authenticateAdmin(outputs);
    const gateway = createGateway(client, modelIntrospection);
    if (args.mode === "dry-run") {
      const mockPath = path.resolve("src/assets/mockBowls2026.json");
      const mock = JSON.parse(await readFile(mockPath, "utf8"));
      const simulation = buildSimulation({
        events: mock.events,
        startAt: args["start-at"] || new Date().toISOString(),
        picksOpenHours: args["picks-open-hours"],
        gameIntervalMinutes: args["game-interval-minutes"],
      });
      const plan = await createDryRunPlan({
        gateway,
        target: TEST26_TARGET,
        simulation,
      });
      printReport(plan);
      if (plan.records.conflicts.length)
        throw new Error(
          "Dry run found blocking conflicts; no plan was written.",
        );
      await mkdir(path.dirname(planPath), { recursive: true });
      await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, {
        encoding: "utf8",
        flag: "w",
      });
      console.log(`\nPlan: ${planPath}`);
      console.log(`Apply confirmation: ${plan.confirmation}`);
      return;
    }

    let plan;
    try {
      plan = JSON.parse(await readFile(planPath, "utf8"));
    } catch {
      throw new Error(`A valid dry-run plan is required at ${planPath}.`);
    }
    verifyTarget({ expected: TEST26_TARGET, actual: plan.target });
    validatePlanArtifact({ plan, confirmation: args.confirmation });
    const currentState = await gateway.readState();
    const result = await applyPlan({
      gateway,
      plan,
      confirmation: args.confirmation,
      currentState,
    });
    console.log("Apply complete:", result);
  } finally {
    if (client) await signOut().catch(() => undefined);
  }
};

main().catch((error) => {
  console.error(`test26 seed refused: ${error.message}`);
  process.exitCode = 1;
});
