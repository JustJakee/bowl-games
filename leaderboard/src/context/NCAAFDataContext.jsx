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
      const filteredResponse = response.filter(
        game => game.away.abbr !== "TBD" && game.home.abbr !== "TBD"
      );
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
