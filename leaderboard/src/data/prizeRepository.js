import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { validatePayoutTiers } from "../../shared/prizeRules.mjs";

let dataClientOverride = null;
export const __setPrizeDataClientForTests = (client) => {
  dataClientOverride = client;
};
const getDataClient = () => dataClientOverride || configuredDataClient;

export const loadPrizeSummary = async ({ seasonId }) => {
  if (!seasonId) throw new Error("An active season is required.");
  const result = await getDataClient().queries.prizePoolSummary(
    { seasonId }, { authMode: "userPool" },
  );
  if (result?.errors?.length) throw new Error(result.errors[0].message);
  const summary = result?.data;
  if (
    summary?.seasonId !== seasonId ||
    !Number.isSafeInteger(summary.confirmedPaidEntryCount) ||
    summary.confirmedPaidEntryCount < 0 ||
    !Number.isSafeInteger(summary.prizePoolCents) ||
    summary.prizePoolCents !== summary.confirmedPaidEntryCount * 500
  ) throw new Error("The prize pool response could not be verified.");
  return summary;
};

export const publishSeasonPayouts = async ({ seasonId, tiers }) => {
  if (!seasonId) throw new Error("An active season is required.");
  const payoutConfigJson = JSON.stringify(validatePayoutTiers(tiers));
  const result = await getDataClient().mutations.publishSeasonPayouts(
    { seasonId, payoutConfigJson }, { authMode: "userPool" },
  );
  if (result?.errors?.length) throw new Error(result.errors[0].message);
  if (result?.data !== payoutConfigJson)
    throw new Error("The payout update could not be confirmed. Refresh to check it.");
  return payoutConfigJson;
};
