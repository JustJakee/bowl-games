// STATE — LEADERBOARD — REACT
import { useEffect, useMemo, useState } from "react";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { loadSeasonLeaderboardData } from "../data/leaderboardRepository";
import { scoreEntries } from "../utils/leaderboardScoring";

export const createLeaderboardLoadState = (current, seasonId) => {
  const sameReadySeason =
    current.ready && current.seasonId === String(seasonId || "");
  return {
    loading: true,
    error: "",
    rows: sameReadySeason ? current.rows : [],
    ready: sameReadySeason,
    seasonId: String(seasonId || ""),
  };
};

export const useSeasonLeaderboard = () => {
  const { allGames, season } = useScoreboard();
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    ready: false,
    seasonId: "",
  });

  useEffect(() => {
    if (!season?.id) {
      setState({
        loading: false,
        error: "",
        rows: [],
        ready: false,
        seasonId: "",
      });
      return;
    }

    let active = true;

    const requestedSeasonId = String(season.id);
    setState((current) =>
      createLeaderboardLoadState(current, requestedSeasonId),
    );

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
            completeEntryIds: result.completeEntryIds,
            usernamesByOwner: result.usernamesByOwner,
          }),
          ready: true,
          seasonId: requestedSeasonId,
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState((current) =>
          current.seasonId === requestedSeasonId
            ? {
                ...current,
                loading: false,
                error: error?.message || "Unable to load the leaderboard.",
              }
            : current,
        );
      });

    return () => {
      active = false;
    };
  }, [allGames, season?.id]);

  return useMemo(() => state, [state]);
};
