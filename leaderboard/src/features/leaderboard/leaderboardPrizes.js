import { formatUsdCents } from "../../../shared/prizeRules.mjs";

export const getPrizeForRank = (payoutsByPosition, rank) =>
  payoutsByPosition?.[rank] ?? null;

export const formatPrize = (amountCents) =>
  Number.isSafeInteger(amountCents) ? formatUsdCents(amountCents) : "";
