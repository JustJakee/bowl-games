import { useCallback, useEffect, useRef, useState } from "react";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { loadPrizeSummary } from "../data/prizeRepository.js";

export const usePrizeSummary = () => {
  const { season } = useScoreboard();
  const seasonId = season?.id || "";
  const requestIdRef = useRef(0);
  const [state, setState] = useState({ seasonId: "", summary: null, loading: true, error: "" });

  const reload = useCallback(async () => {
    if (!seasonId) return;
    const requestId = ++requestIdRef.current;
    setState((current) => ({
      seasonId,
      summary: current.seasonId === seasonId ? current.summary : null,
      loading: current.seasonId !== seasonId || !current.summary,
      error: "",
    }));
    try {
      const summary = await loadPrizeSummary({ seasonId });
      if (requestId !== requestIdRef.current) return;
      setState({ seasonId, summary, loading: false, error: "" });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: error?.message || "Prize information is unavailable.",
      }));
    }
  }, [seasonId]);

  useEffect(() => {
    if (!seasonId) {
      requestIdRef.current += 1;
      setState({ seasonId: "", summary: null, loading: false, error: "" });
      return;
    }
    void reload();
    const timer = window.setInterval(() => void reload(), 60_000);
    window.addEventListener("online", reload);
    return () => {
      requestIdRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("online", reload);
    };
  }, [reload, seasonId]);

  return {
    summary: state.seasonId === seasonId ? state.summary : null,
    loading: state.seasonId === seasonId ? state.loading : Boolean(seasonId),
    error: state.seasonId === seasonId ? state.error : "",
    reload,
  };
};
