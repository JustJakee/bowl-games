import { getEffectivePickLockAt } from "./pickWindow.js";

export const formatRulesDeadline = (picksLockAt, rawGames = [], locale = "en-US") => {
  const effective = getEffectivePickLockAt(picksLockAt, rawGames);
  if (!effective) return "Deadline unavailable";
  return new Intl.DateTimeFormat(locale, {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(effective));
};

export const formatPayoutPercent = (basisPoints) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(basisPoints / 100)}%`;

export const formatPlace = (position) => {
  const suffix = position % 100 >= 11 && position % 100 <= 13
    ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" }[position % 10] || "th");
  return `${position}${suffix}`;
};
