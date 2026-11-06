// STATE — SCOREBOARD — REACT CONTEXT
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { loadSeasonBundle } from "../data/seasonRepository";
import { selectPickableGames } from "../utils/scoreboardGames";
import { createLatestLoadGuard } from "./latestLoad";
import { browserIsOffline, useOfflineStatus } from "../pwa/useOfflineStatus.js";
import { isConnectivityFailure } from "../pwa/networkError.js";

const ScoreboardContext = createContext(null);

export const ScoreboardProvider = ({ pollMs = 60_000, children }) => {
  const {
    hasValidTokens,
    isAuthenticated,
    isConfigured,
    isLoading: authLoading,
    isUnavailable: authUnavailable,
  } = useAuth();
  const offline = useOfflineStatus();
  const [data, setData] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [season, setSeason] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);
  const [rawGames, setRawGames] = useState(null);
  const [error, setError] = useState("");
  const [errorIsConnectivity, setErrorIsConnectivity] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(() =>
    browserIsOffline() ? "offline" : "ready",
  );
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);
  const loadGuard = useRef(createLatestLoadGuard());
  const canLoadData =
    !authLoading && isConfigured && isAuthenticated && hasValidTokens;

  const load = async () => {
    if (!canLoadData) {
      return;
    }

    const requestId = loadGuard.current.start();
    const initial = firstLoad.current;
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await loadSeasonBundle();
      const removeDuplicateBowlName = (game) => {
        if (game.bowl?.includes("College Football Playoff First Round Game")) {
          return {
            ...game,
            bowl: `CFP First Round ${game.away?.abbr} vs ${game.home?.abbr}`,
          };
        }
        return game;
      };

      const SCOREBOARD_EXCLUDED_BOWLS = [
        "Quarterfinal",
        "Semifinal",
        "Playoff National Championship",
        "FCS Championship",
      ];

      const normalizedResponse = (response.games || [])
        .filter((game) => game.bowl.trim())
        .map(removeDuplicateBowlName);

      const filteredResponse = normalizedResponse.filter(
        (game) =>
          !SCOREBOARD_EXCLUDED_BOWLS.some((term) => game.bowl.includes(term)),
      );
      const picksResponse = selectPickableGames(normalizedResponse);

      if (!mounted.current || !loadGuard.current.isCurrent(requestId)) return;
      setSeason(response.season);
      setSeasonConfig(response.seasonConfig);
      setRawGames(response.rawGames || []);
      setData(filteredResponse);
      setAllGames(picksResponse);
      setError("");
      setErrorIsConnectivity(false);
      setConnectionStatus(browserIsOffline() ? "offline" : "ready");
    } catch (err) {
      if (!mounted.current || !loadGuard.current.isCurrent(requestId)) return;
      setError(err?.message ?? "Failed to fetch scoreboard");
      const connectivityFailure = isConnectivityFailure(err);
      setErrorIsConnectivity(connectivityFailure);
      setConnectionStatus(
        connectivityFailure
          ? browserIsOffline() ? "offline" : "unavailable"
          : "ready",
      );
    } finally {
      if (!mounted.current || !loadGuard.current.isCurrent(requestId)) return;
      if (initial) setLoading(false);
      setRefreshing(false);
      firstLoad.current = false;
    }
  };

  useEffect(() => {
    setConnectionStatus((current) =>
      offline ? "offline" : current === "offline" ? "checking" : current,
    );
  }, [offline]);

  useEffect(() => {
    if (!offline && !authLoading && !isAuthenticated && !authUnavailable) {
      setConnectionStatus((current) => current === "checking" ? "ready" : current);
    }
  }, [authLoading, authUnavailable, isAuthenticated, offline]);

  useEffect(() => {
    mounted.current = true;

    if (!canLoadData) {
      loadGuard.current.invalidate();
      setData(null);
      setAllGames(null);
      setSeason(null);
      setSeasonConfig(null);
      setRawGames(null);
      setError("");
      setErrorIsConnectivity(false);
      setLoading(authLoading);
      setRefreshing(false);
      firstLoad.current = true;

      return () => {
        mounted.current = false;
        loadGuard.current.invalidate();
      };
    }

    load();
    const id = setInterval(load, pollMs);
    window.addEventListener("online", load);
    return () => {
      mounted.current = false;
      loadGuard.current.invalidate();
      clearInterval(id);
      window.removeEventListener("online", load);
    };
  }, [authLoading, canLoadData, pollMs]);

  const value = useMemo(
    () => ({
      games: data ?? [],
      allGames: allGames ?? [],
      season,
      seasonConfig,
      rawGames: rawGames ?? [],
      loading,
      refreshing,
      error,
      errorIsConnectivity,
      connectionStatus,
      reload: load,
    }),
    [
      allGames,
      data,
      season,
      seasonConfig,
      rawGames,
      loading,
      refreshing,
      error,
      errorIsConnectivity,
      connectionStatus,
    ],
  );

  return (
    <ScoreboardContext.Provider value={value}>
      {children}
    </ScoreboardContext.Provider>
  );
};

export const useScoreboard = () => {
  const ctx = useContext(ScoreboardContext);
  if (!ctx)
    throw new Error("useScoreboard must be used inside a ScoreboardProvider");
  return ctx;
};
