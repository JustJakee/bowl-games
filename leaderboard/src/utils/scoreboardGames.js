// SCOREBOARD — PRESENTATION
// The top scoreboard answers only "what is live" and "what is next". Keep
// this separate from the complete Games/Picks data set, which must retain finals.
export const isLiveScoreboardGame = (game) =>
  game?.status === "in_progress" ||
  (!game?.status && game?.state === "in");

export const isUpcomingScoreboardGame = (game) =>
  game?.status === "scheduled" ||
  (!game?.status && game?.state === "pre");

const kickoffTime = (game) => {
  const time = new Date(game?.startDate || game?.kickoffAt || "").getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

export const selectTopScoreboardGames = (games = []) =>
  (games || [])
    .filter((game) => isLiveScoreboardGame(game) || isUpcomingScoreboardGame(game))
    .slice()
    .sort((left, right) => {
      const leftLive = isLiveScoreboardGame(left);
      const rightLive = isLiveScoreboardGame(right);
      if (leftLive !== rightLive) return leftLive ? -1 : 1;
      return kickoffTime(left) - kickoffTime(right);
    });
