import { useEffect, useMemo, useState } from "react";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { loadSeasonLeaderboardData } from "../data/leaderboardRepository";
import { scoreEntries } from "../utils/leaderboardScoring";

export const useSeasonLeaderboard = () => {
  const { allGames, season } = useScoreboard();
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
  });

  useEffect(() => {
    if (!season?.id) {
      setState({
        loading: false,
        error: "",
        rows: [],
      });
      return;
    }

    let active = true;

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    loadSeasonLeaderboardData({ seasonId: season.id })
      .then((result) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          rows: scoreEntries({
            entries: result.entries,
            picks: result.picks,
            games: allGames,
            usernamesByOwner: result.usernamesByOwner,
          }),
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: error?.message || "Unable to load the leaderboard.",
          rows: [],
        });
      });

    return () => {
      active = false;
    };
  }, [allGames, season?.id]);

  return useMemo(() => state, [state]);
};
