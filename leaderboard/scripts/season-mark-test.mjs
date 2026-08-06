// ONE-TIME ADMIN UTILITY — SEASON TEST FLAG
// Updates only Season.isTestSeason after the deployed schema exposes the field.
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Amplify } from "aws-amplify";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import { configureAmplifyForNode } from "./test26/auth-session.mjs";
import { ISOLATED_OUTPUTS_PATH } from "./test26/target.mjs";

const usage = "npm run season:mark-test -- --season-id <id> --value true|false --confirm mark-test:<id>:<value>";

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}.`);
    args[key.slice(2)] = value;
    index += 1;
  }
  if (!args["season-id"]) throw new Error(`A season ID is required.\n${usage}`);
  const normalizedValue = args.value ?? "true";
  if (!["true", "false"].includes(normalizedValue)) throw new Error("--value must be true or false.");
  args.value = normalizedValue === "true";
  const expectedConfirmation = `mark-test:${args["season-id"]}:${args.value}`;
  if (args.confirm !== expectedConfirmation) {
    throw new Error(`Refusing update. Pass --confirm ${expectedConfirmation}.`);
  }
  return args;
};

const throwForErrors = (result, fallback) => {
  if (result?.errors?.[0]?.message) throw new Error(result.errors[0].message);
  if (!result?.data) throw new Error(fallback);
  return result.data;
};

const authenticateAdmin = async (outputs) => {
  const username = process.env.TEST26_ADMIN_EMAIL;
  const password = process.env.TEST26_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Set TEST26_ADMIN_EMAIL and TEST26_ADMIN_PASSWORD for an admin account.");
  }
  configureAmplifyForNode({ amplify: Amplify, outputs });
  const result = await signIn({ username, password });
  if (!result.isSignedIn) throw new Error(`Admin sign-in requires ${result.nextStep?.signInStep || "another step"}.`);
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken?.payload?.["cognito:groups"] || [];
  if (!groups.includes("admin")) throw new Error("The authenticated account is not in the admin group.");
  return generateClient();
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const outputsPath = path.resolve(ISOLATED_OUTPUTS_PATH);
  const outputs = JSON.parse(await readFile(outputsPath, "utf8"));
  const seasonFields = outputs?.data?.model_introspection?.models?.Season?.fields || {};
  if (!Object.hasOwn(seasonFields, "isTestSeason")) {
    throw new Error(`The deployed outputs do not include Season.isTestSeason. Deploy the schema and regenerate ${ISOLATED_OUTPUTS_PATH} first.`);
  }

  let client;
  try {
    client = await authenticateAdmin(outputs);
    const season = throwForErrors(
      await client.models.Season.get(
        { id: args["season-id"] },
        { selectionSet: ["id", "name", "status", "isTestSeason"], authMode: "userPool" },
      ),
      "The target season was not found.",
    );
    const configResult = await client.models.SeasonConfig.seasonConfigBySeasonId(
      { seasonId: season.id },
      { limit: 1, selectionSet: ["picksLockAt"], authMode: "userPool" },
    );
    if (configResult?.errors?.[0]?.message) throw new Error(configResult.errors[0].message);
    const picksLockAt = configResult?.data?.[0]?.picksLockAt || "unavailable";
    console.log("Target season before update:", {
      id: season.id,
      name: season.name,
      status: season.status,
      isTestSeason: season.isTestSeason === true,
      picksLockAt,
    });

    const updated = throwForErrors(
      await client.models.Season.update(
        { id: season.id, isTestSeason: args.value },
        { selectionSet: ["id", "name", "status", "isTestSeason"], authMode: "userPool" },
      ),
      "Unable to update the test-season flag.",
    );
    const verified = throwForErrors(
      await client.models.Season.get(
        { id: season.id },
        { selectionSet: ["id", "name", "status", "isTestSeason"], authMode: "userPool" },
      ),
      "Unable to verify the updated season.",
    );
    const verifiedConfigResult = await client.models.SeasonConfig.seasonConfigBySeasonId(
      { seasonId: season.id },
      { limit: 1, selectionSet: ["picksLockAt"], authMode: "userPool" },
    );
    if (verifiedConfigResult?.errors?.[0]?.message) throw new Error(verifiedConfigResult.errors[0].message);
    const verifiedPicksLockAt = verifiedConfigResult?.data?.[0]?.picksLockAt || "unavailable";
    if (
      verified.isTestSeason !== args.value ||
      updated.status !== season.status ||
      verified.status !== season.status ||
      verifiedPicksLockAt !== picksLockAt
    ) {
      throw new Error("Verification failed: the test flag or season status did not match the expected result.");
    }
    console.log("Verified update:", {
      id: verified.id,
      name: verified.name,
      previousIsTestSeason: season.isTestSeason === true,
      isTestSeason: verified.isTestSeason,
      statusUnchanged: verified.status === season.status,
      picksLockAtUnchanged: verifiedPicksLockAt === picksLockAt,
    });
  } finally {
    if (client) await signOut().catch(() => undefined);
  }
};

main().catch((error) => {
  console.error(`season:mark-test refused: ${error.message}`);
  process.exitCode = 1;
});
