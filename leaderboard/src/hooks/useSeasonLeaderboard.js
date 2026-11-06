// STATE — LEADERBOARD — REACT
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { loadSeasonLeaderboardData } from "../data/leaderboardRepository";
import { scoreEntries } from "../utils/leaderboardScoring";
import { isConnectivityFailure } from "../pwa/networkError.js";

const LeaderboardContext = createContext(null);
const emptyState = {
  loading: false,
  error: "",
  errorIsConnectivity: false,
  rows: [],
  ready: false,
  seasonId: "",
  scope: "",
};

export const createLeaderboardLoadState = (current, seasonId) => {
  const sameReadySeason =
    current.ready && current.seasonId === String(seasonId || "");
  return {
    loading: true,
    error: sameReadySeason ? current.error : "",
    errorIsConnectivity: sameReadySeason ? current.errorIsConnectivity : false,
    rows: sameReadySeason ? current.rows : [],
    ready: sameReadySeason,
    seasonId: String(seasonId || ""),
  };
};

export const selectScopedLeaderboardState = (state, scope, owner) =>
  state.scope === scope && owner ? state : emptyState;

export const LeaderboardProvider = ({ children }) => {
  const { allGames, season } = useScoreboard();
  const { isAuthenticated, user } = useAuth();
  const owner = isAuthenticated ? user?.userId || "" : "";
  const scope = `${owner}:${season?.id || ""}`;
  const [active, setActive] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const reload = useCallback(() => {
    setActive(true);
    setRetryKey((current) => current + 1);
  }, []);
  const activate = useCallback(() => setActive(true), []);
  const [state, setState] = useState(emptyState);

  useEffect(() => {
    if (!active || !owner || !season?.id) {
      setState({ ...emptyState, scope });
      return;
    }

    let currentRequest = true;
    const requestedSeasonId = String(season.id);
    setState((current) => ({
      ...createLeaderboardLoadState(
        current.scope === scope ? current : emptyState,
        requestedSeasonId,
      ),
      scope,
    }));

    loadSeasonLeaderboardData({ seasonId: season.id })
      .then((result) => {
        if (!currentRequest) return;
        setState({
          loading: false,
          error: "",
          errorIsConnectivity: false,
          rows: scoreEntries({
            entries: result.entries,
            picks: result.picks,
            games: allGames,
            completeEntryIds: result.completeEntryIds,
            usernamesByOwner: result.usernamesByOwner,
          }),
          ready: true,
          seasonId: requestedSeasonId,
          scope,
        });
      })
      .catch((error) => {
        if (!currentRequest) return;
        setState((current) =>
          current.scope === scope
            ? {
                ...current,
                loading: false,
                error: error?.message || "Unable to load the leaderboard.",
                errorIsConnectivity: isConnectivityFailure(error),
              }
            : current,
        );
      });

    return () => {
      currentRequest = false;
    };
  }, [active, allGames, owner, retryKey, scope, season?.id]);

  useEffect(() => {
    if (!active || !owner || state.scope !== scope || !state.error) return;
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, [active, owner, reload, scope, state.error, state.scope]);

  const safeState = selectScopedLeaderboardState(state, scope, owner);
  const value = useMemo(
    () => ({ ...safeState, reload, activate }),
    [safeState, reload, activate],
  );

  return createElement(LeaderboardContext.Provider, { value }, children);
};

export const useSeasonLeaderboard = () => {
  const context = useContext(LeaderboardContext);
  if (!context) throw new Error("useSeasonLeaderboard must be used inside LeaderboardProvider");
  useEffect(() => context.activate(), [context.activate]);
  return context;
};
