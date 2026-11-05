export const getFirstKickoffTime = (games = []) => {
  const kickoffs = games
    .map((game) => {
      const kickoffAt = game?.kickoffAt || "";
      return /(?:Z|[+-]\d{2}:\d{2})$/i.test(kickoffAt)
        ? Date.parse(kickoffAt)
        : Number.NaN;
    })
    .filter(Number.isFinite);
  return kickoffs.length ? Math.min(...kickoffs) : null;
};

export const canShowDashboardLeaderboard = (firstKickoffTime, now) =>
  firstKickoffTime !== null &&
  Number.isFinite(firstKickoffTime) &&
  now >= firstKickoffTime;

export const getDashboardPaymentState = (entry) => {
  if (!entry) return "none";
  const status = String(entry.paymentStatus || "")
    .trim()
    .toLowerCase();
  return ["paid", "unpaid", "waived", "refunded"].includes(status)
    ? status
    : "unavailable";
};

export const shouldShowAccountPaymentNotification = ({
  currentEntry,
  entriesLoading,
  entriesReady,
}) =>
  entriesReady &&
  !entriesLoading &&
  getDashboardPaymentState(currentEntry) === "unpaid";
