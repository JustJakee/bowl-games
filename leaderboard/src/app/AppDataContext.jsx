import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard";
import { useScoreboard } from "../context/NCAAFDataContext";
import {
  calculatePickSetStatus,
  CURRENT_SEASON_ID,
  CURRENT_SEASON_YEAR,
  getCurrentSeasonEntry,
  loadSavedPicks,
  PICK_SET_STATUS,
  savePicks,
} from "../data/picksRepository";

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
  const { email, isAuthenticated, isConfigured, user } = useAuth();
  const [playerPicks, setPlayerPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState("");
  const [currentEntry, setCurrentEntry] = useState(null);
  const [savedSelectionsByGameId, setSavedSelectionsByGameId] = useState({});
  const [currentEntryStatus, setCurrentEntryStatus] = useState(
    PICK_SET_STATUS.DRAFT
  );
  const [staleSavedPickIds, setStaleSavedPickIds] = useState([]);

  const owner = user?.userId || null;
  const matchups = useMemo(
    () => buildMatchups(scoreboardGames || []),
    [scoreboardGames]
  );
  const requiredGameIds = useMemo(
    () => matchups.map((matchup) => matchup.id).filter(Boolean),
    [matchups]
  );
  const tieBreakerRequired = useMemo(
    () =>
      matchups.some(
        (matchup) =>
          String(matchup?.game || "").trim().toLowerCase() ===
          TIEBREAKER_BOWL_NAME.toLowerCase()
      ),
    [matchups]
  );

  const resetCurrentEntryState = useCallback(() => {
    setPlayerPicks([]);
    setCurrentEntry(null);
    setSavedSelectionsByGameId({});
    setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
    setStaleSavedPickIds([]);
  }, []);

  const loadPicks = useCallback(async () => {
    if (matchups.length === 0) {
      return;
    }

    if (!isAuthenticated || !isConfigured || !owner) {
      resetCurrentEntryState();
      setPicksLoading(false);
      setPicksError("");
      return;
    }

    setPicksLoading(true);
    setPicksError("");

    try {
      const entry = await getCurrentSeasonEntry({
        owner,
        seasonId: CURRENT_SEASON_ID,
      });

      if (!entry) {
        resetCurrentEntryState();
        return;
      }

      const savedPicks = await loadSavedPicks({
        entryId: entry.id,
        seasonId: CURRENT_SEASON_ID,
        currentGameIds: requiredGameIds,
      });
      const status = calculatePickSetStatus({
        requiredGameIds,
        selectionsByGameId: savedPicks.selectionsByGameId,
      });

      setCurrentEntry(entry);
      setSavedSelectionsByGameId(savedPicks.selectionsByGameId);
      setCurrentEntryStatus(status);
      setStaleSavedPickIds(savedPicks.stalePicks.map((pick) => pick.gameId));
      setPlayerPicks([
        {
          id: entry.id,
          name: entry.entryName?.trim() || "Unnamed Entry",
          picks: matchups.map(
            (game) => savedPicks.selectionsByGameId?.[game.id] || "-"
          ),
          tiebreaker: entry.tieBreakerValue,
          status,
        },
      ]);
    } catch (error) {
      console.error("Failed to load picks:", error);
      resetCurrentEntryState();
      setPicksError("Unable to load picks from the database.");
    } finally {
      setPicksLoading(false);
    }
  }, [
    isAuthenticated,
    isConfigured,
    matchups,
    owner,
    requiredGameIds,
    resetCurrentEntryState,
  ]);

  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  const saveCurrentPicks = useCallback(
    async ({
      contactEmail,
      entryName,
      selectionsByGameId,
      tieBreakerValue,
      userProfileId,
    }) => {
      if (!isAuthenticated || !isConfigured || !owner) {
        throw new Error("You must be signed in before picks can be saved.");
      }

      const result = await savePicks({
        owner,
        seasonId: CURRENT_SEASON_ID,
        userProfileId,
        entryName,
        contactEmail,
        tieBreakerValue,
        selectionsByGameId,
        requiredGameIds,
      });

      setCurrentEntry(result.entry);
      setSavedSelectionsByGameId(result.selectionsByGameId);
      setCurrentEntryStatus(result.status);
      setStaleSavedPickIds(result.stalePicks.map((pick) => pick.gameId));
      setPlayerPicks([
        {
          id: result.entry.id,
          name: result.entry.entryName?.trim() || "Unnamed Entry",
          picks: matchups.map(
            (game) => result.selectionsByGameId?.[game.id] || "-"
          ),
          tiebreaker: result.entry.tieBreakerValue,
          status: result.status,
        },
      ]);

      return result;
    },
    [isAuthenticated, isConfigured, matchups, owner, requiredGameIds]
  );

  const value = useMemo(
    () => ({
      currentEntry,
      currentEntryStatus,
      currentSeasonId: CURRENT_SEASON_ID,
      currentSeasonYear: CURRENT_SEASON_YEAR,
      defaultContactEmail: email || "",
      matchups,
      playerPicks,
      picksLoading,
      picksError,
      reloadPicks: loadPicks,
      savedSelectionsByGameId,
      saveCurrentPicks,
      staleSavedPickIds,
      tieBreakerRequired,
    }),
    [
      currentEntry,
      currentEntryStatus,
      email,
      loadPicks,
      matchups,
      picksError,
      picksLoading,
      playerPicks,
      savedSelectionsByGameId,
      saveCurrentPicks,
      staleSavedPickIds,
      tieBreakerRequired,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
};
