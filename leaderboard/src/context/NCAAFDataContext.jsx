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

const ScoreboardContext = createContext(null);

export const ScoreboardProvider = ({ pollMs = 60_000, children }) => {
  const {
    hasValidTokens,
    isAuthenticated,
    isConfigured,
    isLoading: authLoading,
  } = useAuth();
  const [data, setData] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [season, setSeason] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);
  const [rawGames, setRawGames] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);
  const canLoadData =
    !authLoading && isConfigured && isAuthenticated && hasValidTokens;

  const load = async () => {
    if (!canLoadData) {
      return;
    }

    const initial = firstLoad.current;
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

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
      const PICKS_EXCLUDED_BOWLS = ["FCS Championship"];

      const normalizedResponse = (response.games || [])
        .filter((game) => game.bowl.trim())
        .map(removeDuplicateBowlName);

      const filteredResponse = normalizedResponse.filter(
        (game) =>
          !SCOREBOARD_EXCLUDED_BOWLS.some((term) => game.bowl.includes(term)),
      );
      const picksResponse = normalizedResponse.filter(
        (game) =>
          game.bowl.trim() &&
          !PICKS_EXCLUDED_BOWLS.some((term) => game.bowl.includes(term)),
      );

      if (!mounted.current) return;
      setSeason(response.season);
      setSeasonConfig(response.seasonConfig);
      setRawGames(response.rawGames || []);
      setData(filteredResponse);
      setAllGames(picksResponse);
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.message ?? "Failed to fetch scoreboard");
    } finally {
      if (!mounted.current) return;
      if (initial) setLoading(false);
      setRefreshing(false);
      firstLoad.current = false;
    }
  };

  useEffect(() => {
    mounted.current = true;

    if (!canLoadData) {
      setData(null);
      setAllGames(null);
      setSeason(null);
      setSeasonConfig(null);
      setRawGames(null);
      setError("");
      setLoading(authLoading);
      setRefreshing(false);
      firstLoad.current = true;

      return () => {
        mounted.current = false;
      };
    }

    load();
    const id = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
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
