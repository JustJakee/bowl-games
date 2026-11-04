// The selected season and its configured UTC timestamps drive presentation.
// The secure-picks Lambda remains the authority for write deadlines.
export const getSeasonExperience = ({
  season,
  seasonConfig,
  games = [],
  now = Date.now(),
} = {}) => {
  if (!season || !seasonConfig) return "unavailable";
  const status = String(season.status || "").toLowerCase();
  const opensAt = Date.parse(seasonConfig.picksOpenAt || "");
  const locksAt = Date.parse(seasonConfig.picksLockAt || "");
  if (
    !Number.isFinite(opensAt) ||
    !Number.isFinite(locksAt) ||
    opensAt >= locksAt
  )
    return "unavailable";
  if (status === "draft" || (status === "open" && now < opensAt))
    return "pending";
  if (status === "open" && now < locksAt) return "picksOpen";
  if (
    ["complete", "archived"].includes(status) ||
    (games.length > 0 &&
      games.every((game) => ["final", "canceled"].includes(game.status)))
  )
    return "final";
  if (games.some((game) => ["in_progress", "final"].includes(game.status)))
    return "inProgress";
  return "locked";
};

export const shouldShowSeasonPending = (input) =>
  getSeasonExperience(input) === "pending";
