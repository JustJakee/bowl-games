import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFbsTeams } from "../api/espn.js";

const useFbsTeams = () => {
  const [state, setState] = useState({
    teams: [],
    loading: true,
    error: "",
  });
  const requestIdRef = useRef(0);

  const loadTeams = useCallback(async (force = false) => {
    const requestId = ++requestIdRef.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const teams = await fetchFbsTeams({ force });
      if (requestId === requestIdRef.current) {
        setState({ teams, loading: false, error: "" });
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setState((current) => ({
          ...current,
          loading: false,
          error: "Unable to load college football teams.",
        }));
      }
    }
  }, []);

  useEffect(() => {
    loadTeams();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadTeams]);

  return {
    ...state,
    retry: () => loadTeams(true),
  };
};

export default useFbsTeams;
