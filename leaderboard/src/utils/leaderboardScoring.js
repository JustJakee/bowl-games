const buildGameWinnerLookup = (games = []) =>
  (games || []).reduce((accumulator, game) => {
    const winnerTeam = game?.winnerTeam || "";
    const isFinal = game?.isFinal === true || game?.state === "post";

    if (game?.id && winnerTeam && isFinal) {
      accumulator[game.id] = {
        winnerTeam,
        gameTotal:
          Number(game?.home?.score || 0) + Number(game?.away?.score || 0),
      };
    }

    return accumulator;
  }, {});

export const scoreEntries = ({
  entries = [],
  picks = [],
  games = [],
  usernamesByOwner = {},
}) => {
  const winnersByGameId = buildGameWinnerLookup(games);
  const finalGameIds = Object.keys(winnersByGameId);
  const picksByEntryId = picks.reduce((accumulator, pick) => {
    if (!pick?.entryId) {
      return accumulator;
    }

    if (!accumulator[pick.entryId]) {
      accumulator[pick.entryId] = [];
    }

    accumulator[pick.entryId].push(pick);
    return accumulator;
  }, {});

  return (entries || [])
    .map((entry) => {
      const entryPicks = picksByEntryId[entry.id] || [];
      const correctPicks = entryPicks.reduce((score, pick) => {
        const winner = winnersByGameId[pick.gameId]?.winnerTeam;
        return winner && pick.selectedTeam === winner ? score + 1 : score;
      }, 0);
      const championshipGame = games.find(
        (game) => String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
      );
      const championshipTotal = championshipGame
        ? winnersByGameId[championshipGame.id]?.gameTotal
        : null;
      const tieBreakerGuess = Number(entry?.tieBreakerValue);
      const tieBreakerDistance =
        Number.isFinite(tieBreakerGuess) && Number.isFinite(championshipTotal)
          ? Math.abs(tieBreakerGuess - championshipTotal)
          : Number.POSITIVE_INFINITY;

      return {
        id: entry.id,
        entryId: entry.id,
        entryName: entry.entryName,
        username: usernamesByOwner[entry.owner] || "Player",
        points: correctPicks,
        record: `${correctPicks}-${Math.max(finalGameIds.length - correctPicks, 0)}`,
        tieBreakerValue: entry.tieBreakerValue,
        tieBreakerDistance,
      };
    })
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return left.tieBreakerDistance - right.tieBreakerDistance;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
};
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard";
