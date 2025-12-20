import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchFormattedScoreboard } from "../utils/formatGameData";

const ScoreboardContext = createContext(null);

export const ScoreboardProvider = ({ pollMs = 60_000, children }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);

  const load = async () => {
    const initial = firstLoad.current;
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await fetchFormattedScoreboard();
      const removeDuplicateBowlName = (game) => {
        if (game.bowl?.includes("College Football Playoff First Round Game")) {
          return { ...game, bowl: `CFP First Round ${game.away?.abbr} vs ${game.home?.abbr}` };
        }
        return game;
      };

      const filteredResponse = response.filter(
        game => !game.bowl.includes("Quarterfinal") &&
          !game.bowl.includes("Semifinal") &&
          !game.bowl.includes("Playoff National Championship")
      ).map(removeDuplicateBowlName);

      if (!mounted.current) return;
      setData(filteredResponse);
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
    load();
    const id = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [pollMs]);

  const value = useMemo(
    () => ({ games: data ?? [], loading, refreshing, error, reload: load }),
    [data, loading, refreshing, error]
  );

  return (
    <ScoreboardContext.Provider value={value}>
      {children}
    </ScoreboardContext.Provider>
  );
};

export const useScoreboard = () => {
  const ctx = useContext(ScoreboardContext);
  if (!ctx) throw new Error("useScoreboard must be used inside a ScoreboardProvider");
  return ctx;
};
