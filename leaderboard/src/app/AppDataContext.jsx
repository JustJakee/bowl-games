import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useScoreboard } from "../context/NCAAFDataContext";
import { fetchPicks } from "../utils/fetchPicks";
import { AWS_DISABLED } from "../constants/appFlags";

const AppDataContext = createContext(null);

const buildMatchups = (scoreboardGames = []) => {
  const seen = {};

  return scoreboardGames.map((game, index) => {
    const bowlName = game?.bowl || "Bowl Game";
    const count = (seen[bowlName] || 0) + 1;
    seen[bowlName] = count;
    const pickKey = count > 1 ? `${bowlName} (#${count})` : bowlName;

    const homeScore = Number(game?.home?.score);
    const awayScore = Number(game?.away?.score);
    const scoresValid = !Number.isNaN(homeScore) && !Number.isNaN(awayScore);
    let winnerAbbr = "";

    if (scoresValid && (game?.isFinal || game?.state === "post")) {
      if (homeScore > awayScore) winnerAbbr = game?.home?.abbr || "";
      else if (awayScore > homeScore) winnerAbbr = game?.away?.abbr || "";
    }

    return {
      id: game?.id || `game-${index}`,
      game: bowlName,
      pickKey,
      team1: game?.home?.displayName || game?.home?.abbr || "Home",
      team2: game?.away?.displayName || game?.away?.abbr || "Away",
      winner: winnerAbbr,
      date: game?.startTimeText || `${index}`,
      gameTotal: homeScore + awayScore,
    };
  });
};

export const AppDataProvider = ({ children }) => {
  const { games: scoreboardGames } = useScoreboard();
  const [playerPicks, setPlayerPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState("");

  const matchups = useMemo(() => buildMatchups(scoreboardGames || []), [scoreboardGames]);

  const loadPicks = useCallback(async () => {
    if (matchups.length === 0) return;

    if (AWS_DISABLED) {
      setPlayerPicks([]);
      setPicksLoading(false);
      setPicksError("");
      return;
    }

    setPicksLoading(true);
    setPicksError("");

    try {
      const picksResponse = await fetchPicks();
      const submissions =
        picksResponse?.data?.listSubmissions?.items?.filter(Boolean) || [];

      const normalizedPicks = submissions.map((submission) => {
        let parsedPicks = {};

        try {
          parsedPicks = JSON.parse(submission?.picks || "{}");
        } catch (_error) {
          parsedPicks = {};
        }

        return {
          name: submission?.name?.trim() || "Unnamed Entry",
          picks: matchups.map((game) => parsedPicks?.[game?.pickKey || game?.game] || "-"),
          tiebreaker: submission?.tieBreaker,
        };
      });

      setPlayerPicks(normalizedPicks);
    } catch (error) {
      console.error("Failed to load picks:", error);
      setPicksError("Unable to load picks from the database.");
    } finally {
      setPicksLoading(false);
    }
  }, [matchups]);

  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  const value = useMemo(
    () => ({
      matchups,
      playerPicks,
      picksLoading,
      picksError,
      reloadPicks: loadPicks,
    }),
    [loadPicks, matchups, picksError, picksLoading, playerPicks]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};
