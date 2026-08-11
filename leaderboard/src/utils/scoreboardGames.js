// SCOREBOARD — PRESENTATION
// The top scoreboard prioritizes games that need attention while retaining
// completed results for quick reference.
export const isLiveScoreboardGame = (game) =>
  game?.status === "in_progress" ||
  (!game?.status && game?.state === "in");

export const isUpcomingScoreboardGame = (game) =>
  game?.status === "scheduled" ||
  (!game?.status && game?.state === "pre");

export const isFinalScoreboardGame = (game) =>
  game?.status
    ? game.status === "final"
    : game?.isFinal === true || game?.state === "post";

const kickoffTime = (game) => {
  const time = new Date(game?.startDate || game?.kickoffAt || "").getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

export const selectTopScoreboardGames = (games = []) =>
  (games || [])
    .filter(
      (game) =>
        isLiveScoreboardGame(game) ||
        isUpcomingScoreboardGame(game) ||
        isFinalScoreboardGame(game),
    )
    .slice()
    .sort((left, right) => {
      const priority = (game) => {
        if (isLiveScoreboardGame(game)) return 0;
        if (isUpcomingScoreboardGame(game)) return 1;
        return 2;
      };
      const priorityDifference = priority(left) - priority(right);
      if (priorityDifference !== 0) return priorityDifference;
      return kickoffTime(left) - kickoffTime(right);
    });
