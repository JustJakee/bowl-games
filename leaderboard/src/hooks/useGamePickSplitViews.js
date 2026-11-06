// HOOK - SCHEDULE PICKS - VIEW MODEL LOADING
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../app/AppDataContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { loadGamePickSplitViews } from "../data/gamePickSplitsRepository";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { getFirstKickoffTime } from "../utils/dashboardVisibility";
import { isConnectivityFailure } from "../pwa/networkError.js";

export const useGamePickSplitViews = (games = []) => {
  const { currentSeasonId, currentEntry } = useAppData();
  const { rawGames } = useScoreboard();
  const firstSeasonKickoff = getFirstKickoffTime(rawGames);
  const [now, setNow] = useState(Date.now());
  const { user } = useAuth();
  const owner = user?.userId || "";
  const [viewsByGameId, setViewsByGameId] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorIsConnectivity, setErrorIsConnectivity] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const requestIdRef = useRef(0);
  const loadedScopeRef = useRef("");
  const gameIdsKey = useMemo(
    () =>
      games
        .map((game) => game?.id)
        .filter(Boolean)
        .join("|"),
    [games],
  );
  const scope = `${owner}:${currentSeasonId || ""}:${currentEntry?.id || ""}:${gameIdsKey}`;

  useEffect(() => {
    setNow(Date.now());
    if (!Number.isFinite(firstSeasonKickoff) || firstSeasonKickoff <= Date.now()) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      firstSeasonKickoff - Date.now() + 1,
    );
    return () => window.clearTimeout(timer);
  }, [firstSeasonKickoff]);

  useEffect(() => {
    if (!currentSeasonId || games.length === 0) {
      loadedScopeRef.current = "";
      setViewsByGameId({});
      setLoading(false);
      setError("");
      setErrorIsConnectivity(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (loadedScopeRef.current !== scope) setViewsByGameId({});
    setLoading(true);
    setError("");
    setErrorIsConnectivity(false);

    loadGamePickSplitViews({
      seasonId: currentSeasonId,
      games,
      currentEntries: currentEntry ? [currentEntry] : [],
      owner,
      firstSeasonKickoff,
      now,
    })
      .then((nextViews) => {
        if (requestIdRef.current === requestId) {
          setViewsByGameId(nextViews);
          loadedScopeRef.current = scope;
          setError("");
          setErrorIsConnectivity(false);
        }
      })
      .catch((failure) => {
        if (requestIdRef.current === requestId) {
          const connectivityFailure = isConnectivityFailure(failure);
          if (loadedScopeRef.current !== scope || !connectivityFailure) {
            setViewsByGameId({});
          }
          setError(connectivityFailure ? "Pick breakdown unavailable while disconnected." : "Pick breakdown unavailable.");
          setErrorIsConnectivity(connectivityFailure);
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [currentEntry, currentSeasonId, firstSeasonKickoff, gameIdsKey, games, now, owner, retryKey, scope]);

  useEffect(() => {
    if (!error) return;
    const retryOnReconnect = () => setRetryKey((current) => current + 1);
    window.addEventListener("online", retryOnReconnect);
    return () => window.removeEventListener("online", retryOnReconnect);
  }, [error]);

  return {
    viewsByGameId: loadedScopeRef.current === scope ? viewsByGameId : {},
    loading,
    error,
    errorIsConnectivity,
  };
};
