// BUSINESS RULE — LEADERBOARD — SCORING
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

const buildSelectionLookup = (picks = []) =>
  picks.reduce((accumulator, pick) => {
    if (pick?.gameId && pick?.selectedTeam) {
      accumulator[pick.gameId] = pick.selectedTeam;
    }

    return accumulator;
  }, {});

const hasSubmittedPickSet = ({
  entry,
  entryPicks = [],
  requiredGameIds = [],
  tieBreakerRequired = false,
}) => {
  if (requiredGameIds.length === 0) {
    return false;
  }

  const selectionsByGameId = buildSelectionLookup(entryPicks);
  const hasAllSelections = requiredGameIds.every((gameId) =>
    Boolean(selectionsByGameId[gameId]),
  );
  const hasTieBreaker =
    !tieBreakerRequired ||
    entry?.tieBreakerValue === 0 ||
    Boolean(String(entry?.tieBreakerValue ?? "").trim());

  return hasAllSelections && hasTieBreaker;
};

export const scoreEntries = ({
  entries = [],
  picks = [],
  games = [],
  usernamesByOwner = {},
}) => {
  // BUSINESS RULE — TIEBREAKER — NATIONAL CHAMPIONSHIP
  // Equal point totals rank by the smallest distance from the championship's final combined score.
  const winnersByGameId = buildGameWinnerLookup(games);
  const finalGameIds = Object.keys(winnersByGameId);
  const requiredGameIds = games.map((game) => game?.id).filter(Boolean);
  const championshipGame = games.find(
    (game) => String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
  );
  const tieBreakerRequired = Boolean(championshipGame?.id);
  const championshipTotal = championshipGame
    ? winnersByGameId[championshipGame.id]?.gameTotal
    : null;
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
    .filter((entry) =>
      hasSubmittedPickSet({
        entry,
        entryPicks: picksByEntryId[entry.id] || [],
        requiredGameIds,
        tieBreakerRequired,
      }),
    )
    .map((entry) => {
      const entryPicks = picksByEntryId[entry.id] || [];
      const correctPicks = entryPicks.reduce((score, pick) => {
        const winner = winnersByGameId[pick.gameId]?.winnerTeam;
        return winner && pick.selectedTeam === winner ? score + 1 : score;
      }, 0);
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
