// HOOK - SCHEDULE PICKS - VIEW MODEL LOADING
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../app/AppDataContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { loadGamePickSplitViews } from "../data/gamePickSplitsRepository";

export const useGamePickSplitViews = (games = []) => {
  const { currentSeasonId, currentEntry } = useAppData();
  const { user } = useAuth();
  const owner = user?.userId || "";
  const [viewsByGameId, setViewsByGameId] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const gameIdsKey = useMemo(
    () => games.map((game) => game?.id).filter(Boolean).join("|"),
    [games],
  );

  useEffect(() => {
    if (!currentSeasonId || games.length === 0) {
      setViewsByGameId({});
      setLoading(false);
      setError("");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    loadGamePickSplitViews({
      seasonId: currentSeasonId,
      games,
      currentEntries: currentEntry ? [currentEntry] : [],
      owner,
    })
      .then((nextViews) => {
        if (requestIdRef.current === requestId) {
          setViewsByGameId(nextViews);
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setError("Pick breakdown unavailable.");
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [currentEntry, currentSeasonId, gameIdsKey, games, owner]);

  return {
    viewsByGameId,
    loading,
    error,
  };
};
