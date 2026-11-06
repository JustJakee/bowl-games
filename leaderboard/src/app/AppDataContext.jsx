// STATE — ENTRIES — REACT CONTEXT
// Coordinates the active entry and its picks after Auth and scoreboard season data are ready.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard";
import { useScoreboard } from "../context/NCAAFDataContext";
import { usePickWindowLocked } from "../hooks/usePickWindowLocked";
import { getEffectivePickLockAt } from "../utils/pickWindow";
import {
  createOrLoadEntry,
  getCanonicalEntryForUser,
  getEntryById,
} from "../data/entryRepository";
import {
  calculatePickSetStatus,
  loadEntryPicks,
  PICK_SET_STATUS,
  saveEntryState,
} from "../data/picksRepository";
import {
  createPerEntryAutosaveCoordinator,
  shouldApplyPickSaveResult,
} from "../components/picks/picksAutosaveState";
import { runSingleFlight } from "../data/canonicalEntry";
import { isConnectivityFailure } from "../pwa/networkError.js";
import { useOfflineStatus } from "../pwa/useOfflineStatus.js";
import OfflineIndicator from "../pwa/OfflineIndicator.jsx";

const AppDataContext = createContext(null);
const LEGACY_ACTIVE_ENTRY_STORAGE_PREFIX = "bobs-bowl-games-active-entry";

const buildMatchups = (scoreboardGames = []) => {
  const seen = {};

  return scoreboardGames.map((game, index) => {
    const bowlName = game?.bowl || "Bowl Game";
    const count = (seen[bowlName] || 0) + 1;
    seen[bowlName] = count;
    const pickKey = count > 1 ? `${bowlName} (#${count})` : bowlName;

    const homeScore = Number(game?.home?.score);
    const awayScore = Number(game?.away?.score);
    const scoresValid = !Number.isNaN(homeScore) && !Number.isNaN(awayScore);
    let winnerAbbr = game?.winnerTeam || "";

    if (
      !winnerAbbr &&
      scoresValid &&
      (game?.isFinal || game?.state === "post")
    ) {
      if (homeScore > awayScore) winnerAbbr = game?.home?.abbr || "";
      else if (awayScore > homeScore) winnerAbbr = game?.away?.abbr || "";
    }

    return {
      id: game?.id || `game-${index}`,
      game: bowlName,
      pickKey,
      team1: game?.home?.displayName || game?.home?.abbr || "Home",
      team2: game?.away?.displayName || game?.away?.abbr || "Away",
      winner: winnerAbbr,
      date: game?.startTimeText || `${index}`,
      gameTotal: homeScore + awayScore,
    };
  });
};

export const AppDataProvider = ({ children }) => {
  const { allGames: scoreboardGames, rawGames, season, seasonConfig } = useScoreboard();
  const {
    email,
    hasValidTokens,
    isAuthenticated,
    isConfigured,
    isLoading: authLoading,
    role,
    user,
  } = useAuth();
  const isAdmin = role === "admin";
  const offline = useOfflineStatus();
  const { connectionStatus } = useScoreboard();
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [entriesErrorIsConnectivity, setEntriesErrorIsConnectivity] = useState(false);
  const [entriesRefreshError, setEntriesRefreshError] = useState("");
  const [loadedEntriesScope, setLoadedEntriesScope] = useState("");
  const loadedEntriesScopeRef = useRef("");
  const lastEntriesAttemptScopeRef = useRef("");
  const entriesRequestIdRef = useRef(0);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState("");
  const [picksErrorIsConnectivity, setPicksErrorIsConnectivity] = useState(false);
  const [picksRefreshError, setPicksRefreshError] = useState("");
  const [picksRetryKey, setPicksRetryKey] = useState(0);
  const [activeEntryId, setActiveEntryIdState] = useState("");
  const [hydratedEntryId, setHydratedEntryId] = useState("");
  const [savedSelectionsByGameId, setSavedSelectionsByGameId] = useState({});
  const [currentEntryStatus, setCurrentEntryStatus] = useState(
    PICK_SET_STATUS.DRAFT,
  );
  const [staleSavedPickIds, setStaleSavedPickIds] = useState([]);
  const picksRequestIdRef = useRef(0);
  const hydratedEntryIdRef = useRef("");
  const activeEntryIdRef = useRef("");
  const saveScopeRef = useRef("");
  const persistCurrentPicksRef = useRef(null);
  const applySavedPicksResultRef = useRef(null);
  const autosaveCoordinatorRef = useRef(null);
  const createEntryPromiseRef = useRef(null);

  const owner = user?.userId || null;
  const currentSeasonId = season?.id || null;
  const currentSeasonYear = season?.year || null;
  const picksLockAt = getEffectivePickLockAt(seasonConfig?.picksLockAt, rawGames);
  const picksLockedByTime = usePickWindowLocked(picksLockAt, season?.status);
  const picksLocked = !picksLockAt || picksLockedByTime;
  const saveScope = `${owner || "guest"}:${currentSeasonId || "none"}`;
  saveScopeRef.current = saveScope;
  const matchups = useMemo(
    () => buildMatchups(scoreboardGames || []),
    [scoreboardGames],
  );
  const requiredGameIds = useMemo(
    () => matchups.map((matchup) => matchup.id).filter(Boolean),
    [matchups],
  );
  const requiredGameIdsKey = requiredGameIds.join("|");
  const tieBreakerGame = useMemo(
    () =>
      (scoreboardGames || []).find(
        (game) => String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
      ) || null,
    [scoreboardGames],
  );
  const tieBreakerGameId = tieBreakerGame?.id || "";
  const tieBreakerRequired = Boolean(seasonConfig?.tieBreakerRequired);
  const currentEntry = loadedEntriesScope === saveScope
    ? entries.find((entry) => entry.id === activeEntryId) || entries[0] || null
    : null;

  const resetActiveEntryState = useCallback(() => {
    setSavedSelectionsByGameId({});
    setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
    setStaleSavedPickIds([]);
  }, []);

  const setActiveEntryId = useCallback((nextEntryId) => {
    const normalizedEntryId = nextEntryId || "";
    activeEntryIdRef.current = normalizedEntryId;
    setActiveEntryIdState(normalizedEntryId);
  }, []);
  const reloadPicks = useCallback(
    () => setPicksRetryKey((current) => current + 1),
    [],
  );

  const loadEntries = useCallback(async () => {
    const scope = `${owner || "guest"}:${currentSeasonId || "none"}`;
    if (saveScopeRef.current !== scope) return;
    const requestId = ++entriesRequestIdRef.current;
    const isCurrent = () =>
      entriesRequestIdRef.current === requestId &&
      saveScopeRef.current === scope;
    const hadLoadedScope = loadedEntriesScopeRef.current === scope;
    const sameAttemptScope = lastEntriesAttemptScopeRef.current === scope;
    lastEntriesAttemptScopeRef.current = scope;
    // AUTH — SESSION RESTORATION — COGNITO
    // Player-owned Data queries wait for configuration, usable tokens, and a resolved season and owner.
    if (
      authLoading ||
      !isAuthenticated ||
      !isConfigured ||
      !hasValidTokens ||
      !owner ||
      !currentSeasonId
    ) {
      loadedEntriesScopeRef.current = "";
      setLoadedEntriesScope("");
      setEntries([]);
      setEntriesLoading(false);
      setEntriesError("");
      setEntriesErrorIsConnectivity(false);
      setEntriesRefreshError("");
      lastEntriesAttemptScopeRef.current = "";
      setActiveEntryId("");
      setHydratedEntryId("");
      setPicksError("");
      setPicksErrorIsConnectivity(false);
      setPicksRefreshError("");
      resetActiveEntryState();
      return;
    }

    setEntriesLoading(!hadLoadedScope);
    setEntriesError("");
    if (!hadLoadedScope) {
      if (!sameAttemptScope) setEntriesErrorIsConnectivity(false);
      loadedEntriesScopeRef.current = "";
      setLoadedEntriesScope("");
      setEntries([]);
      setEntriesRefreshError("");
      setActiveEntryId("");
      setHydratedEntryId("");
      resetActiveEntryState();
    }

    try {
      window.localStorage.removeItem(
        `${LEGACY_ACTIVE_ENTRY_STORAGE_PREFIX}:${owner}:${currentSeasonId}`,
      );
      const canonicalEntry = await getCanonicalEntryForUser({
        owner,
        seasonId: currentSeasonId,
      });
      if (!isCurrent()) return;
      const nextEntries = canonicalEntry ? [canonicalEntry] : [];
      const canonicalEntryId = canonicalEntry?.id || "";

      setEntries(nextEntries);
      if (activeEntryIdRef.current !== canonicalEntryId) {
        setActiveEntryId(canonicalEntryId);
        setHydratedEntryId("");
        resetActiveEntryState();
        setPicksError("");
        setPicksErrorIsConnectivity(false);
        setPicksRefreshError("");
      } else if (hadLoadedScope && canonicalEntryId) {
        setPicksRetryKey((current) => current + 1);
      }
      loadedEntriesScopeRef.current = scope;
      setLoadedEntriesScope(scope);
      setEntriesErrorIsConnectivity(false);
      setEntriesRefreshError("");
    } catch (error) {
      if (!isCurrent()) return;
      const connectivityFailure = isConnectivityFailure(error);
      if (hadLoadedScope && connectivityFailure) {
        setEntriesRefreshError(error?.message || "Unable to refresh your entry.");
      } else {
        if (!hadLoadedScope) {
          setEntries([]);
          setActiveEntryId("");
          setHydratedEntryId("");
          resetActiveEntryState();
        }
        setEntriesError(error?.message || "Unable to load your pick set.");
        setEntriesErrorIsConnectivity(connectivityFailure);
      }
    } finally {
      if (isCurrent()) setEntriesLoading(false);
    }
  }, [
    authLoading,
    currentSeasonId,
    hasValidTokens,
    isAuthenticated,
    isConfigured,
    owner,
    resetActiveEntryState,
    setActiveEntryId,
  ]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!entriesError && !entriesRefreshError && !picksError && !picksRefreshError) return;
    const retryOnReconnect = () => {
      if (entriesError || entriesRefreshError) void loadEntries();
      else setPicksRetryKey((current) => current + 1);
    };
    window.addEventListener("online", retryOnReconnect);
    return () => window.removeEventListener("online", retryOnReconnect);
  }, [entriesError, entriesRefreshError, loadEntries, picksError, picksRefreshError]);

  useEffect(() => {
    activeEntryIdRef.current = activeEntryId;
  }, [activeEntryId]);

  useEffect(() => {
    hydratedEntryIdRef.current = hydratedEntryId;
  }, [hydratedEntryId]);

  useEffect(() => {
    if (
      authLoading ||
      !hasValidTokens ||
      !isAuthenticated ||
      !activeEntryId ||
      !currentSeasonId ||
      !owner
    ) {
      picksRequestIdRef.current += 1;
      resetActiveEntryState();
      setPicksLoading(false);
      setPicksError("");
      setPicksErrorIsConnectivity(false);
      setPicksRefreshError("");
      return;
    }

    const requestId = picksRequestIdRef.current + 1;
    const requestScope = saveScopeRef.current;
    const isCurrentRequest = () =>
      picksRequestIdRef.current === requestId &&
      saveScopeRef.current === requestScope;
    // STATE — PICKS — REACT CONTEXT
    // A request ID prevents a slower prior hydration request from overwriting the canonical entry.
    picksRequestIdRef.current = requestId;
    const isSelectedEntrySwitch = hydratedEntryIdRef.current !== activeEntryId;
    // A same-entry refresh retains hydrated data. Only expose a blocking
    // loading state while changing entries for the first time.
    setPicksLoading(isSelectedEntrySwitch);
    setPicksError("");

    if (isSelectedEntrySwitch) {
      setPicksErrorIsConnectivity(false);
      setPicksRefreshError("");
      setHydratedEntryId("");
      setSavedSelectionsByGameId({});
      setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
      setStaleSavedPickIds([]);
    }

    Promise.all([
      getEntryById({
        entryId: activeEntryId,
        owner,
        seasonId: currentSeasonId,
      }),
      loadEntryPicks({
        entryId: activeEntryId,
        seasonId: currentSeasonId,
        currentGameIds: requiredGameIds,
      }),
    ])
      .then(([entry, savedPicks]) => {
        if (!isCurrentRequest()) {
          return;
        }

        if (!entry) {
          throw new Error("Your pick set could not be found.");
        }

        setEntries((currentEntries) =>
          currentEntries.map((currentEntryItem) =>
            currentEntryItem.id === entry.id ? entry : currentEntryItem,
          ),
        );
        setSavedSelectionsByGameId(savedPicks.selectionsByGameId);
        setHydratedEntryId(entry.id);
        setCurrentEntryStatus(
          calculatePickSetStatus({
            requiredGameIds,
            selectionsByGameId: savedPicks.selectionsByGameId,
            tieBreakerRequired,
            tieBreakerValue: entry.tieBreakerValue,
          }),
        );
        setStaleSavedPickIds(savedPicks.stalePicks.map((pick) => pick.gameId));
        setPicksErrorIsConnectivity(false);
        setPicksRefreshError("");
      })
      .catch((error) => {
        if (!isCurrentRequest()) {
          return;
        }

        const connectivityFailure = isConnectivityFailure(error);
        if (!isSelectedEntrySwitch && connectivityFailure) {
          setPicksRefreshError(error?.message || "Unable to refresh your picks.");
          return;
        }
        if (isSelectedEntrySwitch) {
          resetActiveEntryState();
          setHydratedEntryId("");
        }
        setPicksError(error?.message || "Unable to load your pick set.");
        setPicksErrorIsConnectivity(connectivityFailure);
      })
      .finally(() => {
        if (isCurrentRequest()) {
          setPicksLoading(false);
        }
      });
    return () => {
      if (picksRequestIdRef.current === requestId)
        picksRequestIdRef.current += 1;
    };
  }, [
    activeEntryId,
    authLoading,
    currentSeasonId,
    hasValidTokens,
    isAuthenticated,
    owner,
    requiredGameIdsKey,
    resetActiveEntryState,
    tieBreakerRequired,
    hydratedEntryIdRef,
    picksRetryKey,
  ]);

  const createSeasonEntry = useCallback(
    async ({ userProfileId } = {}) => {
      if (isAdmin) {
        throw new Error("Admin accounts cannot create entries.");
      }
      if (
        entriesLoading ||
        entriesError ||
        loadedEntriesScope !== saveScopeRef.current
      )
        throw new Error(
          "Your entry has not loaded successfully. Retry loading before creating an entry.",
        );
      if (picksLocked)
        throw new Error("Entries can no longer be created after picks lock.");
      const scope = saveScopeRef.current;

      return runSingleFlight(createEntryPromiseRef, () =>
        createOrLoadEntry({
          owner,
          seasonId: currentSeasonId,
          userProfileId,
          contactEmail: email || "",
        }).then((entry) => {
          if (saveScopeRef.current !== scope)
            throw new Error(
              "Your account or season changed. Reload your entry.",
            );
          setEntries([entry]);
          setActiveEntryId(entry.id);
          resetActiveEntryState();
          return entry;
        }),
      );
    },
    [
      currentSeasonId,
      email,
      entriesError,
      entriesLoading,
      isAdmin,
      loadedEntriesScope,
      owner,
      picksLocked,
      resetActiveEntryState,
      setActiveEntryId,
    ],
  );

  const persistCurrentPicks = useCallback(
    async ({
      entryId,
      contactEmail,
      selectionsByGameId,
      knownSelectionsByGameId,
      forceGameIds,
      tieBreakerValue,
      userProfileId,
      onPickProgress,
    }) => {
      const result = await saveEntryState({
        entryId,
        owner,
        seasonId: currentSeasonId,
        userProfileId,
        contactEmail,
        knownSelectionsByGameId:
          knownSelectionsByGameId || savedSelectionsByGameId,
        forceGameIds,
        tieBreakerValue,
        tieBreakerGameId,
        selectionsByGameId,
        currentGameIds: requiredGameIds,
        tieBreakerRequired,
        picksLockAt,
        onPickProgress,
      });

      return result;
    },
    [
      currentSeasonId,
      owner,
      picksLockAt,
      requiredGameIds,
      savedSelectionsByGameId,
      tieBreakerGameId,
      tieBreakerRequired,
    ],
  );

  const applySavedPicksResult = useCallback(
    ({ entryId, result, scope = saveScopeRef.current }) => {
      const resultEntryId = result?.entry?.id || "";
      const resultBelongsToRequest =
        entryId && resultEntryId === entryId && scope === saveScopeRef.current;

      if (!resultBelongsToRequest) {
        return false;
      }

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === result.entry.id ? result.entry : entry,
        ),
      );

      const applyToActiveEntry = shouldApplyPickSaveResult({
        activeEntryId: activeEntryIdRef.current,
        requestedEntryId: entryId,
        resultEntryId,
        currentScope: saveScopeRef.current,
        requestScope: scope,
      });

      if (applyToActiveEntry) {
        // A hydration started before this acknowledged mutation may still be
        // in flight. It cannot replace the newer confirmed selections.
        picksRequestIdRef.current += 1;
        setPicksLoading(false);
        setSavedSelectionsByGameId(result.selectionsByGameId);
        setCurrentEntryStatus(result.status);
        setStaleSavedPickIds(
          (result.stalePicks || []).map((pick) => pick.gameId),
        );
      }

      return true;
    },
    [],
  );

  persistCurrentPicksRef.current = persistCurrentPicks;
  applySavedPicksResultRef.current = applySavedPicksResult;

  if (!autosaveCoordinatorRef.current) {
    autosaveCoordinatorRef.current = createPerEntryAutosaveCoordinator({
      save: ({ input, persist }) => persist(input),
      onSuccess: ({ entryId, result, scope }) => {
        return applySavedPicksResultRef.current({ entryId, result, scope });
      },
      onError: ({ entryId, error, scope }) => {
        if (error?.partialResult) {
          applySavedPicksResultRef.current({
            entryId,
            result: error.partialResult,
            scope,
          });
        }
      },
    });
  }

  useEffect(() => {
    // Pending requests belong to the account and season that queued them.
    // An in-flight request cannot be aborted, but its response is scope-guarded.
    autosaveCoordinatorRef.current.cancelPending();
  }, [saveScope]);

  const markCurrentPicksRevision = useCallback((entryId, revision) => {
    return autosaveCoordinatorRef.current.markLatest(
      entryId,
      revision,
      saveScopeRef.current,
    );
  }, []);

  const nextCurrentPicksRevision = useCallback(
    (entryId, minimumRevision = 0) => {
      return autosaveCoordinatorRef.current.nextRevision(
        entryId,
        minimumRevision,
        saveScopeRef.current,
      );
    },
    [],
  );

  const queueCurrentPicksSave = useCallback(
    ({ revision, entryId, ...input }) => {
      const targetEntryId = entryId || activeEntryIdRef.current;
      const scope = saveScopeRef.current;

      return autosaveCoordinatorRef.current.enqueue({
        entryId: targetEntryId,
        revision,
        scope,
        persist: persistCurrentPicksRef.current,
        input: {
          ...input,
          entryId: targetEntryId,
        },
      });
    },
    [],
  );

  const saveCurrentPicks = useCallback(
    async ({ entryId, ...input }) => {
      const targetEntryId = entryId || activeEntryIdRef.current;

      if (!targetEntryId) {
        throw new Error("The requested entry was not found.");
      }

      const revision = nextCurrentPicksRevision(targetEntryId);
      const outcome = await queueCurrentPicksSave({
        ...input,
        entryId: targetEntryId,
        revision,
      });

      if (outcome.status === "saved") {
        return outcome.result;
      }

      if (outcome.status === "failed") {
        throw outcome.error;
      }

      throw new Error(
        "This save was replaced by a newer set of picks. Please retry if your latest choices are not visible.",
      );
    },
    [nextCurrentPicksRevision, queueCurrentPicksSave],
  );

  const value = useMemo(
    () => ({
      createSeasonEntry,
      currentEntry,
      currentEntryStatus,
      currentSeasonId,
      currentSeasonYear,
      defaultContactEmail: email || "",
      isAdmin,
      entriesError,
      entriesErrorIsConnectivity,
      entriesRefreshError,
      entriesLoading,
      entriesReady:
        loadedEntriesScope === saveScope && !entriesLoading && !entriesError,
      matchups,
      markCurrentPicksRevision,
      nextCurrentPicksRevision,
      hydratedEntryId,
      picksLoading,
      picksError,
      picksErrorIsConnectivity,
      picksRefreshError,
      picksLocked,
      picksLockAt,
      reloadEntries: loadEntries,
      reloadPicks,
      queueCurrentPicksSave,
      saveCurrentPicks,
      savedSelectionsByGameId,
      staleSavedPickIds,
      tieBreakerGameId,
      tieBreakerRequired,
    }),
    [
      createSeasonEntry,
      currentEntry,
      currentEntryStatus,
      currentSeasonId,
      currentSeasonYear,
      email,
      isAdmin,
      entriesError,
      entriesErrorIsConnectivity,
      entriesRefreshError,
      entriesLoading,
      loadedEntriesScope,
      saveScope,
      loadEntries,
      reloadPicks,
      matchups,
      markCurrentPicksRevision,
      nextCurrentPicksRevision,
      hydratedEntryId,
      picksError,
      picksErrorIsConnectivity,
      picksRefreshError,
      picksLocked,
      picksLoading,
      picksLockAt,
      queueCurrentPicksSave,
      saveCurrentPicks,
      savedSelectionsByGameId,
      staleSavedPickIds,
      tieBreakerGameId,
      tieBreakerRequired,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>
      <OfflineIndicator status={offline ? "offline" : connectionStatus !== "ready" ? connectionStatus : entriesErrorIsConnectivity || picksErrorIsConnectivity || entriesRefreshError || picksRefreshError ? "unavailable" : "ready"} />
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }

  return context;
};
