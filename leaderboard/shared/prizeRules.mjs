import { selectCanonicalEntriesByUser } from "../src/data/canonicalEntry.js";

export const ENTRY_FEE_CENTS = 500;

export const validatePayoutTiers = (tiers) => {
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > 20)
    throw new Error("Add at least one payout place (maximum 20).");

  const normalized = tiers.map((tier) => {
    const position = Number(tier?.position);
    const percentageBasisPoints = Number(tier?.percentageBasisPoints);
    const label = String(tier?.label || "").trim();
    if (!Number.isSafeInteger(position) || position < 1 || position > 20)
      throw new Error("Each payout place must be a positive whole number.");
    if (
      !Number.isSafeInteger(percentageBasisPoints) ||
      percentageBasisPoints < 1 ||
      percentageBasisPoints > 10000
    ) throw new Error("Each payout percentage must be greater than 0 and at most 100.");
    if (label.length > 60)
      throw new Error("Payout labels must be 60 characters or fewer.");
    return { position, percentageBasisPoints, label };
  }).sort((left, right) => left.position - right.position);

  if (normalized.some((tier, index) => tier.position !== index + 1))
    throw new Error("Payout places must be consecutive, starting with first place.");
  if (normalized.reduce((sum, tier) => sum + tier.percentageBasisPoints, 0) !== 10000)
    throw new Error("Payout percentages must total exactly 100%.");
  return normalized;
};

export const parsePayoutTiers = (value) => {
  if (value === null || value === undefined || value === "") return null;
  let parsed;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error("The saved payout configuration is invalid.");
  }
  return validatePayoutTiers(parsed);
};

export const countConfirmedPaidEntries = ({ entries = [], picks = [], seasonId }) => {
  // Owner is the stable identity for current entries. Legacy rows with and
  // without profile linkage must not become two paid places for one owner.
  const normalizedEntries = entries.filter((entry) =>
    entry?.owner || entry?.userProfileId || entry?.userProfile?.id,
  ).map((entry) => entry?.owner
    ? { ...entry, userProfileId: null, userProfile: null }
    : entry);
  return selectCanonicalEntriesByUser({ entries: normalizedEntries, picks, seasonId }).filter(
    (entry) => String(entry.paymentStatus || "").toLowerCase() === "paid",
  ).length;
};

export const calculatePrizePoolCents = (paidCount) => {
  if (!Number.isSafeInteger(paidCount) || paidCount < 0 ||
      !Number.isSafeInteger(paidCount * ENTRY_FEE_CENTS))
    throw new Error("The confirmed paid entry count is invalid.");
  return paidCount * ENTRY_FEE_CENTS;
};

export const calculatePayouts = (poolCents, tiers) => {
  if (!Number.isSafeInteger(poolCents) || poolCents < 0)
    throw new Error("The prize pool is invalid.");
  const validTiers = validatePayoutTiers(tiers);
  const allocations = validTiers.map((tier) => {
    const product = BigInt(poolCents) * BigInt(tier.percentageBasisPoints);
    return {
      ...tier,
      payoutCents: Number(product / 10000n),
      remainder: Number(product % 10000n),
    };
  });
  let remaining = poolCents - allocations.reduce((sum, tier) => sum + tier.payoutCents, 0);
  for (const tier of [...allocations].sort((left, right) =>
    right.remainder - left.remainder || left.position - right.position,
  )) {
    if (remaining <= 0) break;
    tier.payoutCents += 1;
    remaining -= 1;
  }
  return allocations.map(({ remainder, ...tier }) => tier);
};

export const formatUsdCents = (cents) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
}).format(cents / 100);

