import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/prizes";
import {
  assertPrizeReader,
  assertPayoutAdmin,
  assertActivePrizeSeason,
  buildPrizeSummary,
  preparePayoutPublication,
} from "./rules.mjs";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient();
const authMode = "iam";

const checked = (result, label) => {
  if (result?.errors?.length)
    throw new Error(`${label}: ${result.errors.map((error) => error.message).join("; ")}`);
  if (!result) throw new Error(`${label}: no backend response.`);
  return result.data;
};

const allPages = async (loadPage, label) => {
  const rows = [];
  let nextToken;
  do {
    const result = await loadPage(nextToken);
    const page = checked(result, label);
    if (!Array.isArray(page)) throw new Error(`${label}: invalid list response.`);
    rows.push(...page.filter(Boolean));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return rows;
};

const getSeason = async (seasonId) => checked(
  await client.models.Season.get({ id: seasonId }, {
    authMode, selectionSet: ["id", "isActive"],
  }),
  "Load season",
);

const getPayout = async (seasonId) => {
  const payout = checked(await client.models.SeasonPayout.get({ id: seasonId }, {
    authMode, selectionSet: ["id", "seasonId", "payoutConfigJson"],
  }), "Load season payouts");
  if (payout && payout.seasonId !== seasonId)
    throw new Error("The season payout configuration is invalid.");
  return payout;
};

const getEntries = (seasonId) => allPages((nextToken) =>
  client.models.Entry.list({
    authMode, limit: 100, nextToken,
    filter: { seasonId: { eq: seasonId } },
    selectionSet: [
      "id", "seasonId", "owner", "userProfileId", "isDeleted",
      "paymentStatus", "createdAt", "updatedAt",
    ],
  }), "Load season entries");

const getPicks = (seasonId) => allPages((nextToken) =>
  client.models.Pick.picksBySeason({ seasonId }, {
    authMode, limit: 100, nextToken,
    selectionSet: ["id", "entryId", "seasonId", "createdAt", "updatedAt"],
  }), "Load canonical entry activity");

export const handler = async (event) => {
  const seasonId = event.arguments?.seasonId;
  if (!seasonId || typeof seasonId !== "string")
    throw new Error("A season ID is required.");

  if (event.fieldName === "prizePoolSummary") {
    assertPrizeReader(event.identity);
    const season = await getSeason(seasonId);
    assertActivePrizeSeason(season, seasonId);
    const [config, entries, picks] = await Promise.all([
      getPayout(seasonId), getEntries(seasonId), getPicks(seasonId),
    ]);
    return buildPrizeSummary({ season, seasonId, config, entries, picks });
  }

  if (event.fieldName === "publishSeasonPayouts") {
    assertPayoutAdmin(event.identity);
    const payoutConfigJson = preparePayoutPublication(
      event.identity, event.arguments?.payoutConfigJson,
    );
    const season = await getSeason(seasonId);
    assertActivePrizeSeason(season, seasonId);
    const existing = await getPayout(seasonId);
    const input = { id: seasonId, seasonId, payoutConfigJson };
    const result = existing
      ? await client.models.SeasonPayout.update(input, {
          authMode, selectionSet: ["id", "seasonId", "payoutConfigJson"],
        })
      : await client.models.SeasonPayout.create(input, {
          authMode, selectionSet: ["id", "seasonId", "payoutConfigJson"],
        });
    const updated = checked(result,
    "Publish payouts");
    if (updated?.id !== seasonId || updated.payoutConfigJson !== payoutConfigJson)
      throw new Error("The payout update could not be confirmed.");
    return updated.payoutConfigJson;
  }

  throw new Error("Unsupported prize operation.");
};
