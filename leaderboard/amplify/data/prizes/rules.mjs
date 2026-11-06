import {
  calculatePrizePoolCents,
  countConfirmedPaidEntries,
  parsePayoutTiers,
  validatePayoutTiers,
} from "../../../shared/prizeRules.mjs";

const groupsFor = (identity) => identity?.groups || identity?.claims?.["cognito:groups"] || [];

export const assertPrizeReader = (identity) => {
  if (!identity?.sub || !groupsFor(identity).some((group) => ["player", "admin"].includes(group)))
    throw new Error("A signed-in player or administrator is required.");
};

export const assertPayoutAdmin = (identity) => {
  if (!identity?.sub || !groupsFor(identity).includes("admin"))
    throw new Error("Administrator authorization is required.");
};

export const assertActivePrizeSeason = (season, seasonId) => {
  if (!season || season.id !== seasonId || season.isActive !== true)
    throw new Error("The active season is unavailable.");
};

export const buildPrizeSummary = ({ season, seasonId, entries, picks, config }) => {
  assertActivePrizeSeason(season, seasonId);
  const confirmedPaidEntryCount = countConfirmedPaidEntries({ entries, picks, seasonId });
  return {
    seasonId,
    confirmedPaidEntryCount,
    prizePoolCents: calculatePrizePoolCents(confirmedPaidEntryCount),
    payoutConfigJson: config?.payoutConfigJson || null,
  };
};

export const preparePayoutPublication = (identity, serializedTiers) => {
  assertPayoutAdmin(identity);
  const tiers = parsePayoutTiers(serializedTiers);
  if (!tiers) throw new Error("A valid payout distribution is required.");
  return JSON.stringify(validatePayoutTiers(tiers));
};
