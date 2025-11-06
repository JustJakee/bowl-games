import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchFormattedScoreboard } from "../utils/formatGameData";

const ScoreboardContext = createContext(null);

export const ScoreboardProvider = ({ pollMs = 60_000, children }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchFormattedScoreboard();
      if (!mounted.current) return;
      setData(response);
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.message ?? "Failed to fetch scoreboard");
    } finally {
    if (mounted.current) setLoading(false);
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
    () => ({ games: data ?? [], loading, error, reload: load }),
    [data, loading, error]
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
