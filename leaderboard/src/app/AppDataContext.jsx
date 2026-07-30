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
import {
  createEntry,
  getEntryById,
  softDeleteEntry,
  listEntriesForSeason,
  updateEntry,
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

const AppDataContext = createContext(null);
const ACTIVE_ENTRY_STORAGE_PREFIX = "bobs-bowl-games-active-entry";

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

const getActiveEntryStorageKey = (owner, seasonId) =>
  `${ACTIVE_ENTRY_STORAGE_PREFIX}:${owner || "guest"}:${seasonId || "none"}`;

export const AppDataProvider = ({ children }) => {
  const {
    allGames: scoreboardGames,
    season,
    seasonConfig,
  } = useScoreboard();
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
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState("");
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

  const owner = user?.userId || null;
  const currentSeasonId = season?.id || null;
  const currentSeasonYear = season?.year || null;
  const picksLockAt = seasonConfig?.picksLockAt || null;
  const picksLocked = usePickWindowLocked(picksLockAt);
  const saveScope = `${owner || "guest"}:${currentSeasonId || "none"}`;
  saveScopeRef.current = saveScope;
  const activeEntryStorageKey = getActiveEntryStorageKey(
    owner,
    currentSeasonId,
  );
  const matchups = useMemo(
    () => buildMatchups(scoreboardGames || []),
    [scoreboardGames],
  );
  const requiredGameIds = useMemo(
    () => matchups.map((matchup) => matchup.id).filter(Boolean),
    [matchups],
  );
  const tieBreakerGame = useMemo(
    () =>
      (scoreboardGames || []).find(
        (game) => String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
      ) || null,
    [scoreboardGames],
  );
  const tieBreakerGameId = tieBreakerGame?.id || "";
  const tieBreakerRequired = Boolean(tieBreakerGameId);
  const currentEntry =
    entries.find((entry) => entry.id === activeEntryId) || entries[0] || null;

  const resetActiveEntryState = useCallback(() => {
    setSavedSelectionsByGameId({});
    setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
    setStaleSavedPickIds([]);
  }, []);

  const setActiveEntryId = useCallback(
    (nextEntryId) => {
      const normalizedEntryId = nextEntryId || "";
      activeEntryIdRef.current = normalizedEntryId;
      setActiveEntryIdState(normalizedEntryId);

      if (!activeEntryStorageKey) {
        return;
      }

      if (!nextEntryId) {
        window.localStorage.removeItem(activeEntryStorageKey);
        return;
      }

      window.localStorage.setItem(activeEntryStorageKey, nextEntryId);
    },
    [activeEntryStorageKey],
  );

  const loadEntries = useCallback(async () => {
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
      setEntries([]);
      setEntriesLoading(false);
      setEntriesError("");
      setActiveEntryId("");
      resetActiveEntryState();
      return;
    }

    setEntriesLoading(true);
    setEntriesError("");
    setHydratedEntryId("");
    setSavedSelectionsByGameId({});
    setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
    setStaleSavedPickIds([]);

    try {
      const nextEntries = await listEntriesForSeason({
        owner,
        seasonId: currentSeasonId,
      });
      const persistedEntryId =
        window.localStorage.getItem(activeEntryStorageKey) || "";
      const fallbackEntryId =
        nextEntries.find((entry) => entry.id === persistedEntryId)?.id ||
        nextEntries[0]?.id ||
        "";

      setEntries(nextEntries);
      activeEntryIdRef.current = fallbackEntryId;
      setActiveEntryIdState(fallbackEntryId);

      if (fallbackEntryId) {
        window.localStorage.setItem(activeEntryStorageKey, fallbackEntryId);
      } else {
        window.localStorage.removeItem(activeEntryStorageKey);
      }
    } catch (error) {
      setEntries([]);
      setEntriesError(error?.message || "Unable to load your entries.");
      setActiveEntryId("");
      setHydratedEntryId("");
      resetActiveEntryState();
    } finally {
      setEntriesLoading(false);
    }
  }, [
    activeEntryStorageKey,
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
      resetActiveEntryState();
      setPicksLoading(false);
      setPicksError("");
      return;
    }

    const requestId = picksRequestIdRef.current + 1;
    // STATE — PICKS — REACT CONTEXT
    // A request ID prevents a slower prior entry request from overwriting the newly selected entry.
    picksRequestIdRef.current = requestId;
    const isSelectedEntrySwitch =
      hydratedEntryIdRef.current !== activeEntryId;
    setPicksLoading(true);
    setPicksError("");

    if (isSelectedEntrySwitch) {
      setHydratedEntryId("");
      setSavedSelectionsByGameId({});
      setCurrentEntryStatus(PICK_SET_STATUS.DRAFT);
      setStaleSavedPickIds([]);
    }

    Promise.all([
      getEntryById({ entryId: activeEntryId, owner }),
      loadEntryPicks({
        entryId: activeEntryId,
        seasonId: currentSeasonId,
        currentGameIds: requiredGameIds,
      }),
    ])
      .then(([entry, savedPicks]) => {
        if (picksRequestIdRef.current !== requestId) {
          return;
        }

        if (!entry) {
          throw new Error("The selected entry could not be found.");
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
      })
      .catch((error) => {
        if (picksRequestIdRef.current !== requestId) {
          return;
        }

        if (isSelectedEntrySwitch) {
          resetActiveEntryState();
          setHydratedEntryId("");
        }
        setPicksError(error?.message || "Unable to load the selected entry.");
      })
      .finally(() => {
        if (picksRequestIdRef.current === requestId) {
          setPicksLoading(false);
        }
      });
  }, [
    activeEntryId,
    authLoading,
    currentSeasonId,
    hasValidTokens,
    isAuthenticated,
    owner,
    requiredGameIds,
    resetActiveEntryState,
    tieBreakerRequired,
    hydratedEntryIdRef,
  ]);

  const createSeasonEntry = useCallback(
    async ({ entryName, userProfileId }) => {
      if (isAdmin) {
        throw new Error("Admin accounts cannot create entries.");
      }

      const createdEntry = await createEntry({
        owner,
        seasonId: currentSeasonId,
        userProfileId,
        entryName,
        contactEmail: email || "",
      });

      setEntries((currentEntries) => [createdEntry, ...currentEntries]);
      setActiveEntryId(createdEntry.id);
      resetActiveEntryState();

      return createdEntry;
    },
    [currentSeasonId, email, isAdmin, owner, resetActiveEntryState, setActiveEntryId],
  );

  const deleteSeasonEntry = useCallback(
    async ({ entryId }) => {
      if (!entryId) {
        throw new Error("The requested entry was not found.");
      }

      const activeEntryWasDeleted = activeEntryId === entryId;
      const nextEntryId = entries.find((entry) => entry.id !== entryId)?.id || "";
      const deletedEntry = await softDeleteEntry({
        entryId,
        owner,
        picksLocked,
      });

      setEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== deletedEntry.id),
      );

      if (activeEntryWasDeleted) {
        setActiveEntryId(nextEntryId);
        resetActiveEntryState();
      }

      return deletedEntry;
    },
    [
      activeEntryId,
      entries,
      owner,
      picksLocked,
      resetActiveEntryState,
      setActiveEntryId,
    ],
  );

  const renameSeasonEntry = useCallback(
    async ({ entryId, entryName, userProfileId }) => {
      const updatedEntry = await updateEntry({
        entryId,
        owner,
        seasonId: currentSeasonId,
        entryName,
        contactEmail: email || "",
        userProfileId,
      });

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry,
        ),
      );

      return updatedEntry;
    },
    [currentSeasonId, email, owner],
  );

  const persistCurrentPicks = useCallback(
    async ({
      entryId,
      contactEmail,
      entryName,
      selectionsByGameId,
      tieBreakerValue,
      userProfileId,
    }) => {
      const result = await saveEntryState({
        entryId,
        owner,
        seasonId: currentSeasonId,
        userProfileId,
        entryName,
        contactEmail,
        tieBreakerValue,
        tieBreakerGameId,
        selectionsByGameId,
        currentGameIds: requiredGameIds,
        tieBreakerRequired,
        picksLockAt,
      });

      return result;
    },
    [
      currentSeasonId,
      owner,
      picksLockAt,
      requiredGameIds,
      tieBreakerGameId,
      tieBreakerRequired,
    ],
  );

  const applySavedPicksResult = useCallback(
    ({ entryId, result, scope = saveScopeRef.current }) => {
      const resultEntryId = result?.entry?.id || "";
      const resultBelongsToRequest =
        entryId &&
        resultEntryId === entryId &&
        scope === saveScopeRef.current;

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

  const playerPicks = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        name: entry.entryName?.trim() || "Unnamed Entry",
        picks:
          entry.id === currentEntry?.id
            ? matchups.map((game) => savedSelectionsByGameId?.[game.id] || "-")
            : [],
        tiebreaker: entry.tieBreakerValue,
        status:
          entry.id === currentEntry?.id
            ? currentEntryStatus
            : PICK_SET_STATUS.DRAFT,
      })),
    [
      currentEntry?.id,
      currentEntryStatus,
      entries,
      matchups,
      savedSelectionsByGameId,
    ],
  );

  const value = useMemo(
    () => ({
      activeEntryId,
      createSeasonEntry,
      currentEntry,
      currentEntryStatus,
      currentSeasonId,
      currentSeasonYear,
      defaultContactEmail: email || "",
      isAdmin,
      deleteSeasonEntry,
      entries,
      entriesError,
      entriesLoading,
      matchups,
      markCurrentPicksRevision,
      nextCurrentPicksRevision,
      hydratedEntryId,
      picksLoading,
      picksError,
      picksLocked,
      playerPicks,
      picksLockAt,
      reloadEntries: loadEntries,
      renameSeasonEntry,
      queueCurrentPicksSave,
      saveCurrentPicks,
      savedSelectionsByGameId,
      setActiveEntryId,
      staleSavedPickIds,
      tieBreakerGameId,
      tieBreakerRequired,
    }),
    [
      activeEntryId,
      createSeasonEntry,
      currentEntry,
      currentEntryStatus,
      currentSeasonId,
      currentSeasonYear,
      email,
      isAdmin,
      deleteSeasonEntry,
      entries,
      entriesError,
      entriesLoading,
      loadEntries,
      matchups,
      markCurrentPicksRevision,
      nextCurrentPicksRevision,
      hydratedEntryId,
      picksError,
      picksLocked,
      picksLoading,
      playerPicks,
      picksLockAt,
      renameSeasonEntry,
      queueCurrentPicksSave,
      saveCurrentPicks,
      savedSelectionsByGameId,
      setActiveEntryId,
      staleSavedPickIds,
      tieBreakerGameId,
      tieBreakerRequired,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }

  return context;
};
