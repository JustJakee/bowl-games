// UI — PICKS — REACT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useAppData } from "../../app/AppDataContext.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useUserProfile } from "../../auth/UserProfileContext.jsx";
import { TIEBREAKER_BOWL_NAME } from "../../constants/PickMatchupCard";
import Panel from "../common/Panel";
import TeamLogo from "../common/TeamLogo";
import { useScoreboard } from "../../context/NCAAFDataContext.jsx";
import { formatCompactPickLockMessage } from "../../utils/pickWindow";
import { buildPickSelectionView } from "./pickSelectionView";
import { getSelectedEntryPickLoadRemainingMs } from "./selectedEntryPickLoading";
import {
  buildAutosaveDiagnostic,
  buildAutosaveFailureState,
  buildAutosaveSuccessState,
  buildSyncedDraft,
  buildFailedClearDraft,
  buildClearFailureState,
  getDraftRevision,
  isDraftCacheReady,
  reconcilePickDraft,
  getMatchupSaveState,
} from "./picksAutosaveState";
import {
  formatPicksDateKey,
  formatPicksDateLabel,
  formatPicksMetaLabel,
  formatPicksTimeLabel,
  getTeamIdentity,
} from "../../utils/picksGameUtils";
import {
  buildEditableGameIdSet,
  buildClearAllDraft,
  getFilterCountBadgeColors,
  matchesEditableSelections,
  getPickActionsState,
  randomizePickSet,
  toggleGameSelection,
} from "./pickActions";
import {
  getRandomizeFeedback,
  RANDOMIZE_PHASE,
  runRandomizeLifecycle,
} from "./randomizeFeedback";
import { buildClearProgress } from "./clearProgress";
import PickActionOverlay from "./PickActionOverlay";
import LockedPicksView from "./LockedPicksView";
import EntryStartState from "./EntryStartState";

const STORAGE_KEY_PREFIX = "bobs-bowl-games-picks-drafts";
const ENABLE_PICK_FILTERS = false;

// STATE — PICKS — LOCAL STORAGE
// Including player and season prevents partial drafts from crossing accounts or contests.
const buildDraftStorageKey = (profileIdOrEmail, seasonId) =>
  `${STORAGE_KEY_PREFIX}:${profileIdOrEmail || "default"}:${seasonId || "none"}`;

const readDraftCache = (storageKey) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeDraftCache = (storageKey, draftsByEntryId) => {
  window.localStorage.setItem(storageKey, JSON.stringify(draftsByEntryId));
};

const useSelectedEntryPickLoadGate = ({
  isLoadingSelectedEntryPicks,
  selectedEntryId,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const loadingSessionRef = useRef({ entryId: "", startedAt: 0 });
  const hideTimerRef = useRef(null);

  useLayoutEffect(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (!selectedEntryId) {
      loadingSessionRef.current = { entryId: "", startedAt: 0 };
      setIsVisible(false);
      return undefined;
    }

    if (isLoadingSelectedEntryPicks) {
      if (loadingSessionRef.current.entryId !== selectedEntryId) {
        loadingSessionRef.current = {
          entryId: selectedEntryId,
          startedAt: Date.now(),
        };
      }

      setIsVisible(true);
      return undefined;
    }

    if (loadingSessionRef.current.entryId !== selectedEntryId) {
      loadingSessionRef.current = { entryId: "", startedAt: 0 };
      setIsVisible(false);
      return undefined;
    }

    const remainingMs = getSelectedEntryPickLoadRemainingMs({
      startedAt: loadingSessionRef.current.startedAt,
      now: Date.now(),
    });

    if (remainingMs === 0) {
      loadingSessionRef.current = { entryId: "", startedAt: 0 };
      setIsVisible(false);
      return undefined;
    }

    hideTimerRef.current = window.setTimeout(() => {
      loadingSessionRef.current = { entryId: "", startedAt: 0 };
      hideTimerRef.current = null;
      setIsVisible(false);
    }, remainingMs);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isLoadingSelectedEntryPicks, selectedEntryId]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    },
    [],
  );

  return isVisible;
};

const normalizeColor = (value) => {
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
};

const buildPicksGames = (games = []) =>
  (games || [])
    .map((game, index) => {
      const awayIdentity = getTeamIdentity(
        game?.away?.displayName,
        game?.away?.abbr,
      );
      const homeIdentity = getTeamIdentity(
        game?.home?.displayName,
        game?.home?.abbr,
      );
      const startTime = game?.startDate
        ? new Date(game.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;

      return {
        id: game?.id || `pick-game-${index}`,
        bowl: game?.bowl || "Bowl Game",
        network: game?.network || "",
        location: game?.location || "",
        startDate: game?.startDate || "",
        startDateLabel: formatPicksDateLabel(game?.startDate),
        startTime,
        startTimeText:
          formatPicksTimeLabel(game?.startDate) ||
          game?.startTimeText ||
          game?.statusText ||
          "Time TBD",
        statusText: game?.statusText || "",
        state: game?.state || "pre",
        isFinal: Boolean(game?.isFinal),
        winnerTeam: game?.winnerTeam || "",
        isTieBreakerGame:
          String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
        away: {
          id: game?.away?.id || `${game?.id}-away`,
          abbr: game?.away?.abbr || "AWAY",
          displayName: game?.away?.displayName || game?.away?.abbr || "Away",
          school: awayIdentity.school,
          mascot: awayIdentity.mascot,
          rank: game?.away?.rank && game.away.rank < 99 ? game.away.rank : null,
          logo: game?.away?.logo || "",
          score: game?.away?.score ?? "",
          color: normalizeColor(
            game?.away?.color || game?.away?.alternateColor,
          ),
        },
        home: {
          id: game?.home?.id || `${game?.id}-home`,
          abbr: game?.home?.abbr || "HOME",
          displayName: game?.home?.displayName || game?.home?.abbr || "Home",
          school: homeIdentity.school,
          mascot: homeIdentity.mascot,
          rank: game?.home?.rank && game.home.rank < 99 ? game.home.rank : null,
          logo: game?.home?.logo || "",
          score: game?.home?.score ?? "",
          color: normalizeColor(
            game?.home?.color || game?.home?.alternateColor,
          ),
        },
      };
    })
    .sort((left, right) => left.startTime - right.startTime);

const buildGroups = (games = []) => {
  const grouped = new Map();

  games.forEach((game) => {
    const key = formatPicksDateKey(game?.startDate) || game.startDateLabel;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: game.startDateLabel,
        games: [],
      });
    }

    grouped.get(key).games.push(game);
  });

  return Array.from(grouped.values());
};

const SegmentedButton = ({ active, count, label, onClick }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      flex: 1,
      flexBasis: 128,
      minHeight: 46,
      px: 2,
      gap: 1,
      justifyContent: "center",
      color: active ? "primary.contrastText" : "text.primary",
      backgroundColor: active ? "primary.main" : "transparent",
      border: "1px solid",
      borderColor: active ? "primary.main" : "divider",
      borderRadius: 999,
      "&:hover": {
        backgroundColor: active
          ? "primary.main"
          : (theme) => alpha(theme.palette.common.white, 0.04),
        borderColor: active ? "primary.main" : "text.secondary",
      },
      "&:focus-visible": {
        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
        outlineOffset: -2,
      },
    }}
  >
    <Typography variant="button" sx={{ fontSize: "0.8rem" }}>
      {label}
    </Typography>
    <Chip
      label={count}
      size="small"
      sx={{
        height: 24,
        minWidth: 30,
        bgcolor: getFilterCountBadgeColors(active).backgroundColor,
        color: getFilterCountBadgeColors(active).color,
        fontWeight: 700,
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  </ButtonBase>
);

const SaveStatus = ({ state, detail, onRetry }) => {
  const saved = state === "saved";
  const saving = state === "saving";
  const title = saved
    ? "All picks saved"
    : saving
      ? "Saving picks..."
      : "Unable to save picks";
  const icon =
    saved ? (
      <CheckCircleRoundedIcon />
    ) : saving ? (
      <CircularProgress size={22} thickness={5} color="inherit" />
    ) : (
      <ErrorOutlineRoundedIcon />
    );
  const color = saved
    ? "success.main"
    : saving
      ? "text.secondary"
      : "error.main";

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{ minWidth: 0 }}
    >
      <Box
        sx={{
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ color, fontWeight: 800 }}>
          {title}
        </Typography>
        {saved ? (
          <Typography variant="body2" color="text.secondary">
            Changes save automatically
          </Typography>
        ) : detail ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {detail}
          </Typography>
        ) : null}
      </Stack>
      {onRetry && !saved && !saving ? (
        <Button
          size="small"
          variant="text"
          startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={onRetry}
          sx={{ minWidth: "auto", px: 1 }}
        >
          Retry
        </Button>
      ) : null}
    </Stack>
  );
};

const MatchupSaveStatus = ({ state, message }) => {
  if (!message) {
    return null;
  }

  const icon =
    state === "error" ? (
      <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
    ) : state === "device" ? (
      <SaveRoundedIcon sx={{ fontSize: 14 }} />
    ) : (
      <CloudDoneRoundedIcon sx={{ fontSize: 14 }} />
    );

  const color =
    state === "error"
      ? "error.main"
      : state === "device"
        ? "warning.main"
        : state === "saving"
          ? "text.secondary"
          : "success.main";

  return (
    <Stack
      direction="row"
      spacing={0.6}
      alignItems="center"
      sx={{ color, minWidth: 0 }}
    >
      {icon}
      <Typography
        variant="caption"
        sx={{
          color: "inherit",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {message}
      </Typography>
    </Stack>
  );
};

const TeamPickButton = ({ disabled, selected, team, onClick }) => (
  <ButtonBase
    disabled={disabled}
    onClick={onClick}
    aria-pressed={selected}
    sx={{
      width: "100%",
      textAlign: "left",
      borderRadius: 2,
      border: "1px solid",
      borderColor: selected ? "primary.main" : "divider",
      backgroundColor: selected
        ? (theme) => alpha(theme.palette.primary.main, 0.09)
        : (theme) => alpha(theme.palette.background.default, 0.34),
      boxShadow: selected
        ? "0 0 0 1px rgba(255,203,5,0.22), 0 0 20px rgba(255,203,5,0.12)"
        : "none",
      p: { xs: 1.5, sm: 1.65 },
      minHeight: { xs: 96, md: 102 },
      alignItems: "stretch",
      justifyContent: "flex-start",
      color: "text.primary",
      "&:hover": {
        backgroundColor: selected
          ? (theme) => alpha(theme.palette.primary.main, 0.12)
          : (theme) => alpha(theme.palette.common.white, 0.04),
      },
      "&:focus-visible": {
        outline: (theme) => `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
    }}
  >
    <Stack spacing={1.1} sx={{ width: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.35}
        sx={{ minWidth: 0, flex: 1 }}
      >
        <Stack
          direction="row"
          spacing={1.35}
          alignItems="center"
          sx={{ minWidth: 0, flex: 1 }}
        >
          <TeamLogo
            src={team.logo}
            alt={`${team.displayName} logo`}
            abbr={team.abbr}
            size={selected ? 52 : 48}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1rem", md: "1.05rem" },
                lineHeight: 1.2,
                pr: 0.5,
                whiteSpace: { xs: "normal", md: "nowrap" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: { xs: 2, md: "unset" },
                WebkitBoxOrient: "vertical",
              }}
            >
              {team.rank ? `${team.rank} ` : ""}
              {team.school}
            </Typography>
            {team.mascot ? (
              <Typography
                variant="body2"
                color={selected ? "text.primary" : "text.secondary"}
                sx={{ lineHeight: 1.25 }}
              >
                {team.mascot}
              </Typography>
            ) : null}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ letterSpacing: "0.08em" }}
            >
              {team.abbr}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  </ButtonBase>
);

const PicksWorkspace = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { email, role } = useAuth();
  const isAdmin = role === "admin";
  const { profile } = useUserProfile();
  const { allGames, loading, error, reload } = useScoreboard();
  const {
    createSeasonEntry,
    currentEntry,
    hydratedEntryId,
    currentSeasonId,
    currentSeasonYear,
    defaultContactEmail,
    entriesError,
    entriesLoading,
    entriesReady,
    reloadEntries,
    markCurrentPicksRevision,
    nextCurrentPicksRevision,
    picksLoading,
    picksError,
    picksLockAt,
    picksLocked,
    queueCurrentPicksSave,
    savedSelectionsByGameId,
    tieBreakerGameId,
    tieBreakerRequired,
  } = useAppData();
  const storageKey = buildDraftStorageKey(
    profile?.id || email,
    currentSeasonId,
  );
  const gameRefs = useRef({});
  const isMountedRef = useRef(false);
  const selectedEntryIdRef = useRef("");
  const storageKeyRef = useRef(storageKey);
  const bulkOperationRef = useRef("");
  const randomizeOperationRef = useRef(false);
  selectedEntryIdRef.current = currentEntry?.id || "";
  storageKeyRef.current = storageKey;
  const [draftsByEntryId, setDraftsByEntryId] = useState({});
  const [loadedDraftStorageKey, setLoadedDraftStorageKey] = useState("");
  const [filter, setFilter] = useState("all");
  const [saveState, setSaveState] = useState({
    state: "saved",
    message: "Saved to account",
    detail: "",
  });
  const [draftStorageError, setDraftStorageError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [retryKey, setRetryKey] = useState(0);
  const [entryActionError, setEntryActionError] = useState("");
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [bulkOperation, setBulkOperation] = useState("");
  const [clearProgress, setClearProgress] = useState(() =>
    buildClearProgress(),
  );
  const [randomizePhase, setRandomizePhase] = useState(
    RANDOMIZE_PHASE.IDLE,
  );
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const games = useMemo(() => buildPicksGames(allGames || []), [allGames]);
  const groupedGames = useMemo(() => buildGroups(games), [games]);
  const tieBreakerGame = useMemo(
    () => games.find((game) => game.id === tieBreakerGameId) || null,
    [games, tieBreakerGameId],
  );
  const editableGameIds = useMemo(
    () => buildEditableGameIdSet({ games, picksLocked }),
    [games, picksLocked],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setDraftsByEntryId(readDraftCache(storageKey));
    setLoadedDraftStorageKey(storageKey);
  }, [storageKey]);

  const persistDraftCache = useCallback((key, drafts) => {
    try {
      writeDraftCache(key, drafts);
      setDraftStorageError((currentError) =>
        currentError ? "" : currentError,
      );
      return true;
    } catch (storageError) {
      console.error("Pick draft device persistence failed.", {
        name: storageError?.name || "Error",
        message: storageError?.message || "Local storage rejected the draft.",
      });
      setDraftStorageError(
        "This browser could not persist the latest draft. Keep this tab open and retry after freeing device storage.",
      );
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isDraftCacheReady(loadedDraftStorageKey, storageKey)) return;
    persistDraftCache(storageKey, draftsByEntryId);
  }, [
    draftsByEntryId,
    loadedDraftStorageKey,
    retryKey,
    storageKey,
    persistDraftCache,
  ]);

  useEffect(() => {
    const nextExpanded = {};
    groupedGames.forEach((group) => {
      nextExpanded[group.key] = expandedGroups[group.key] ?? true;
    });
    setExpandedGroups((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextExpanded);

      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === nextExpanded[key])
      ) {
        return current;
      }

      return nextExpanded;
    });
  }, [groupedGames]);

  useEffect(() => {
    if (
      !currentEntry ||
      !isDraftCacheReady(loadedDraftStorageKey, storageKey) ||
      hydratedEntryId !== currentEntry.id ||
      picksError
    ) {
      return;
    }

    const backendDraft = {
      entryName: currentEntry.entryName,
      selectionsByGameId: savedSelectionsByGameId || {},
      tieBreakerValue:
        currentEntry.tieBreakerValue === null ||
        currentEntry.tieBreakerValue === undefined
          ? ""
          : String(currentEntry.tieBreakerValue),
    };

    setDraftsByEntryId((currentDrafts) => {
      const existingDraft = currentDrafts[currentEntry.id];

      const nextDraft = reconcilePickDraft({
        draft: existingDraft,
        backendDraft,
        cacheReady: true,
        hydrated: true,
      });
      return nextDraft === existingDraft
        ? currentDrafts
        : { ...currentDrafts, [currentEntry.id]: nextDraft };
    });

    setSaveState((currentState) => {
      const existingDraft = draftsByEntryId[currentEntry.id];
      // A dirty draft is normally queued for autosave. Do not label it
      // device-only until a save has actually failed; that old optimistic
      // label was what made desktop matchup labels disagree with mobile.
      const nextState = existingDraft?.clearError
        ? buildClearFailureState(existingDraft.clearError)
        : existingDraft?.dirty
          ? currentState.state === "device" || currentState.state === "error"
            ? currentState
            : {
                state: "saving",
                message: "Saving...",
                detail: "",
              }
          : {
              state: "saved",
              message: "Saved to account",
              detail: "",
            };

      if (
        currentState.state === nextState.state &&
        currentState.message === nextState.message &&
        currentState.detail === nextState.detail
      ) {
        return currentState;
      }

      return nextState;
    });
  }, [
    currentEntry,
    draftsByEntryId,
    savedSelectionsByGameId,
    loadedDraftStorageKey,
    storageKey,
    hydratedEntryId,
    picksError,
  ]);

  const activeDraft = currentEntry
    ? draftsByEntryId[currentEntry.id] || null
    : null;
  const visibleSaveState = draftStorageError
    ? {
        state: "error",
        message: "Device save failed",
        detail: draftStorageError,
      }
    : activeDraft?.dirty && saveState.state === "saved"
      ? { state: "saving", message: "Saving...", detail: "" }
      : saveState;
  const selectedEntryId = currentEntry?.id || "";
  const pickView = buildPickSelectionView({
    currentEntry,
    hydratedEntryId,
    activeDraft,
    games,
    picksLoading,
    picksLocked,
    tieBreakerRequired,
  });
  const {
    entryStatus,
    hasTieBreaker,
    incompleteCount,
    isLoadingSelectedEntryPicks,
    missingRequiredTieBreaker,
    progressPercent,
    selectedCount,
    selectionsByGameId,
    tieBreakerValue,
  } = pickView;
  const showSelectedEntryPickLoadingCard = useSelectedEntryPickLoadGate({
    isLoadingSelectedEntryPicks,
    selectedEntryId,
  });
  const blockSelectedEntryPickUi = showSelectedEntryPickLoadingCard;
  const progressCountLabel = blockSelectedEntryPickUi
    ? "-- / --"
    : `${selectedCount} / ${games.length}`;
  const entryStatusLabel = blockSelectedEntryPickUi
    ? "--"
    : entryStatus === "COMPLETE"
      ? "Complete"
      : entryStatus === "LOCKED"
        ? "Locked"
        : "In Progress";
  const pickActionsState = getPickActionsState({
    games,
    selectionsByGameId,
    editableGameIds,
    tieBreakerRequired,
    tieBreakerValue,
  });
  const randomizeFeedback = getRandomizeFeedback({
    phase: randomizePhase,
    idleLabel: pickActionsState.randomizeLabel,
  });
  const randomizeButtonLabel = randomizeFeedback.isProcessing
    ? randomizeFeedback.label
    : pickActionsState.canRandomizeTieBreaker &&
        pickActionsState.incompleteEditableCount === 0
      ? "Randomize Tiebreaker"
    : pickActionsState.selectedEditableCount > 0
      ? "Randomize Remaining"
      : "Randomize All";
  const isBulkProcessing =
    Boolean(bulkOperation) || randomizeFeedback.isProcessing;

  const filteredGames = useMemo(() => {
    if (blockSelectedEntryPickUi) return [];
    if (!activeDraft) return games;

    return games.filter((game) => {
      const hasSelection = Boolean(selectionsByGameId?.[game.id]);
      const isIncomplete =
        !hasSelection ||
        (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker);

      if (filter === "selected") return hasSelection;
      if (filter === "incomplete") return isIncomplete;
      return true;
    });
  }, [
    activeDraft,
    filter,
    games,
    hasTieBreaker,
    blockSelectedEntryPickUi,
    selectionsByGameId,
    tieBreakerRequired,
  ]);

  const filteredGroups = useMemo(
    () => buildGroups(filteredGames),
    [filteredGames],
  );

  useEffect(() => {
    if (
      !currentEntry ||
      !isDraftCacheReady(loadedDraftStorageKey, storageKey) ||
      hydratedEntryId !== currentEntry.id ||
      picksError ||
      !activeDraft?.dirty ||
      activeDraft.clearError ||
      picksLocked ||
      picksLoading ||
      bulkOperationRef.current
    ) {
      return;
    }

    const entryId = currentEntry.id;
    const revision = getDraftRevision(activeDraft);
    const requestStorageKey = storageKey;
    // DATA — PICKS — AUTOSAVE
    // The provider serializes saves by Entry. Marking the revision before the
    // debounce ensures an older in-flight response cannot clear a newer edit.
    markCurrentPicksRevision(entryId, revision);
    setSaveState({
      state: "saving",
      message: "Saving...",
      detail: "",
    });

    const timeoutId = window.setTimeout(async () => {
      const outcome = await queueCurrentPicksSave({
        entryId,
        revision,
        contactEmail: defaultContactEmail || email || "",
        selectionsByGameId: activeDraft.selectionsByGameId || {},
        forceGameIds: activeDraft.changedGameIds || [],
        tieBreakerValue: activeDraft.tieBreakerValue,
        userProfileId: profile?.id,
      });

      if (
        !isMountedRef.current ||
        storageKeyRef.current !== requestStorageKey
      ) {
        return;
      }

      if (outcome.status === "saved" && outcome.result?.entry?.id === entryId) {
        setDraftsByEntryId((currentDrafts) => {
          const latestDraft = currentDrafts[entryId];

          if (getDraftRevision(latestDraft) !== revision) {
            return currentDrafts;
          }

          return {
            ...currentDrafts,
            [entryId]: buildSyncedDraft(outcome.result, revision),
          };
        });

        if (selectedEntryIdRef.current === entryId) {
          setSaveState(buildAutosaveSuccessState());
        }
      } else if (outcome.status === "failed") {
        console.error(
          "Pick autosave failed.",
          buildAutosaveDiagnostic({
            error: outcome.error,
            entryId,
            revision,
            localSelectionCount: Object.keys(
              activeDraft.selectionsByGameId || {},
            ).length,
          }),
        );

        if (activeDraft.clearAll) {
          const failedDraft = buildFailedClearDraft(
            activeDraft,
            outcome.error,
          );
          setDraftsByEntryId((currentDrafts) =>
            getDraftRevision(currentDrafts[entryId]) === revision
              ? { ...currentDrafts, [entryId]: failedDraft }
              : currentDrafts,
          );
          if (selectedEntryIdRef.current === entryId)
            setSaveState(buildClearFailureState(failedDraft.clearError));
        } else if (selectedEntryIdRef.current === entryId) {
          setSaveState(buildAutosaveFailureState(outcome.error));
        }
      }
    }, 550);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeDraft,
    loadedDraftStorageKey,
    hydratedEntryId,
    picksError,
    currentEntry,
    defaultContactEmail,
    email,
    profile?.id,
    picksLocked,
    picksLoading,
    markCurrentPicksRevision,
    queueCurrentPicksSave,
    retryKey,
    storageKey,
  ]);

  const updateActiveDraft = (updater) => {
    if (!currentEntry || blockSelectedEntryPickUi || bulkOperationRef.current) {
      return;
    }

    const entryId = currentEntry.id;
    const nextRevision = nextCurrentPicksRevision(
      entryId,
      getDraftRevision(activeDraft),
    );

    if (!Number.isSafeInteger(nextRevision)) {
      return;
    }

    setDraftsByEntryId((currentDrafts) => {
      const existingDraft = currentDrafts[entryId] || {
        entryName: currentEntry.entryName,
        selectionsByGameId: savedSelectionsByGameId || {},
        tieBreakerValue:
          currentEntry.tieBreakerValue === null ||
          currentEntry.tieBreakerValue === undefined
            ? ""
            : String(currentEntry.tieBreakerValue),
        dirty: false,
      };
      const nextDraft =
        typeof updater === "function"
          ? updater(existingDraft)
          : { ...existingDraft, ...updater };

      return {
        ...currentDrafts,
        [entryId]: {
          ...nextDraft,
          revision: nextRevision,
          dirty: true,
          clearAll: false,
          clearError: null,
        },
      };
    });
  };

  const handleTeamPick = (gameId, teamCode) => {
    if (picksLocked || blockSelectedEntryPickUi || bulkOperationRef.current) {
      return;
    }

    updateActiveDraft((draft) => ({
      ...draft,
      changedGameIds: [...new Set([...(draft.changedGameIds || []), gameId])],
      selectionsByGameId: toggleGameSelection({
        gameId,
        selectedTeam: teamCode,
        selectionsByGameId: draft.selectionsByGameId,
        editableGameIds,
      }),
    }));
  };

  const handleTieBreakerChange = (value) => {
    if (picksLocked || blockSelectedEntryPickUi || bulkOperationRef.current) {
      return;
    }

    updateActiveDraft((draft) => ({
      ...draft,
      tieBreakerValue: value,
    }));
  };

  const runBulkSelectionSave = async ({
    operation,
    nextSelectionsByGameId,
    nextTieBreakerValue,
    successMessage,
  }) => {
    if (
      bulkOperationRef.current ||
      !currentEntry ||
      !activeDraft ||
      !isDraftCacheReady(loadedDraftStorageKey, storageKey) ||
      hydratedEntryId !== currentEntry.id ||
      picksError ||
      blockSelectedEntryPickUi ||
      picksLocked
    ) {
      return;
    }

    const entryId = currentEntry.id;
    const revision = nextCurrentPicksRevision(
      entryId,
      getDraftRevision(activeDraft),
    );

    if (!Number.isSafeInteger(revision)) {
      return;
    }

    const requestStorageKey = storageKey;
    const nextDraft =
      operation === "clear"
        ? buildClearAllDraft({
            draft: activeDraft,
            editableGameIds,
            revision,
          })
        : {
            ...activeDraft,
            selectionsByGameId: nextSelectionsByGameId,
            tieBreakerValue:
              nextTieBreakerValue === undefined
                ? activeDraft.tieBreakerValue
                : nextTieBreakerValue,
            changedGameIds: [
              ...new Set([
                ...(activeDraft.changedGameIds || []),
                ...[...editableGameIds].filter(
                  (gameId) =>
                    (activeDraft.selectionsByGameId?.[gameId] || "") !==
                    (nextSelectionsByGameId?.[gameId] || ""),
                ),
              ]),
            ],
            revision,
            dirty: true,
            clearAll: false,
            clearError: null,
          };

    // Record clear intent before dispatching. If the page closes while the
    // request is in flight, an older selected device draft must not survive it.
    if (
      operation === "clear" &&
      !persistDraftCache(storageKey, {
        ...draftsByEntryId,
        [entryId]: nextDraft,
      })
    ) {
      setBulkFeedback({
        open: true,
        severity: "error",
        message:
          "Clear All could not start because this browser could not store the clear request. Free device storage and retry.",
      });
      setClearDialogOpen(false);
      return;
    }

    if (operation === "clear") {
      setClearProgress(
        buildClearProgress({
          completed: 0,
          total: nextDraft.changedGameIds.filter((gameId) =>
            editableGameIds.has(gameId),
          ).length,
        }),
      );
    }

    bulkOperationRef.current = operation;
    setBulkOperation(operation);
    setDraftsByEntryId((currentDrafts) => ({
      ...currentDrafts,
      [entryId]: nextDraft,
    }));
    setSaveState({
      state: "saving",
      message:
        operation === "clear" ? "Clearing picks..." : "Randomizing picks...",
      detail: "",
    });

    try {
      const outcome = await queueCurrentPicksSave({
        entryId,
        revision,
        contactEmail: defaultContactEmail || email || "",
        selectionsByGameId: nextDraft.selectionsByGameId,
        knownSelectionsByGameId: activeDraft.selectionsByGameId,
        forceGameIds: nextDraft.changedGameIds,
        tieBreakerValue: nextDraft.tieBreakerValue,
        userProfileId: profile?.id,
        onPickProgress:
          operation === "clear"
            ? ({ completed, total }) => {
                if (
                  !isMountedRef.current ||
                  storageKeyRef.current !== requestStorageKey ||
                  selectedEntryIdRef.current !== entryId
                ) {
                  return;
                }
                setClearProgress(buildClearProgress({ completed, total }));
              }
            : undefined,
      }).catch((error) => ({ status: "failed", error }));

      if (
        !isMountedRef.current ||
        storageKeyRef.current !== requestStorageKey
      ) {
        return;
      }

      if (
        outcome.status === "saved" &&
        outcome.result?.entry?.id === entryId &&
        matchesEditableSelections({
          requested: nextDraft.selectionsByGameId,
          confirmed: outcome.result.selectionsByGameId,
          editableGameIds,
        })
      ) {
        setDraftsByEntryId((currentDrafts) => {
          const latestDraft = currentDrafts[entryId];

          if (getDraftRevision(latestDraft) !== revision) {
            return currentDrafts;
          }

          return {
            ...currentDrafts,
            [entryId]: buildSyncedDraft(outcome.result, revision),
          };
        });
        setSaveState(buildAutosaveSuccessState());
        setBulkFeedback({
          open: true,
          severity: "success",
          message: successMessage,
        });
        return;
      }

      const operationError =
        outcome.error ||
        new Error(
          "The backend did not confirm every requested selection. Reload or retry.",
        );
      const partialResult = operationError.partialResult;

      if (operation === "clear") {
        const failedDraft = buildFailedClearDraft(nextDraft, operationError);
        setDraftsByEntryId((currentDrafts) =>
          getDraftRevision(currentDrafts[entryId]) === revision
            ? { ...currentDrafts, [entryId]: failedDraft }
            : currentDrafts,
        );
        setSaveState(buildClearFailureState(failedDraft.clearError));
      } else if (partialResult?.entry?.id === entryId) {
        setDraftsByEntryId((currentDrafts) => {
          const latestDraft = currentDrafts[entryId];

          if (getDraftRevision(latestDraft) !== revision) {
            return currentDrafts;
          }

          return {
            ...currentDrafts,
            [entryId]: buildSyncedDraft(partialResult, revision),
          };
        });
        setSaveState({
          state: "error",
          message: "Partially saved",
          detail:
            "Confirmed changes were kept. Reload to check the remaining selections, then retry.",
        });
      } else {
        setSaveState(buildAutosaveFailureState(operationError));
      }
      setBulkFeedback({
        open: true,
        severity: "error",
        message: partialResult
          ? "Some changes were not confirmed. Confirmed changes were kept; reload or retry the remaining selections."
          : "Changes could not be saved to your account. They remain saved on this device for Retry.",
      });
    } finally {
      bulkOperationRef.current = "";
      setBulkOperation("");
      if (operation === "clear") {
        setClearDialogOpen(false);
      }
    }
  };

  const handleRandomizePicks = () => {
    if (
      !pickActionsState.canRandomize ||
      bulkOperationRef.current ||
      randomizeOperationRef.current
    ) {
      return;
    }

    void runRandomizeLifecycle({
      lockRef: randomizeOperationRef,
      createSelections: () =>
        randomizePickSet({
          games,
          selectionsByGameId,
          editableGameIds,
          tieBreakerRequired,
          tieBreakerValue,
        }),
      persistSelections: (randomizedPickSet) =>
        runBulkSelectionSave({
          operation: "randomize",
          nextSelectionsByGameId: randomizedPickSet.selectionsByGameId,
          nextTieBreakerValue: randomizedPickSet.tieBreakerValue,
          successMessage: "Randomized picks were saved to your account.",
        }),
      onPhaseChange: (phase) => {
        if (phase === RANDOMIZE_PHASE.RANDOMIZING) {
          flushSync(() => setRandomizePhase(phase));
          return;
        }
        setRandomizePhase(phase);
      },
    });
  };

  const handleConfirmClearPicks = () => {
    if (!pickActionsState.canClear || bulkOperationRef.current) {
      return;
    }

    void runBulkSelectionSave({
      operation: "clear",
      successMessage: "Unlocked picks were cleared.",
    });
  };

  const handleCreatePickSet = async () => {
    if (creatingEntry || !entriesReady || entriesError || picksLocked) return;

    setCreatingEntry(true);
    setEntryActionError("");

    try {
      await createSeasonEntry({
        userProfileId: profile?.id,
      });
    } catch (error) {
      setEntryActionError(error?.message || "Unable to create your entry.");
    } finally {
      setCreatingEntry(false);
    }
  };

  const jumpToIncomplete = () => {
    const nextIncomplete = games.find((game) => {
      const hasSelection = Boolean(activeDraft?.selectionsByGameId?.[game.id]);
      if (!hasSelection) return true;
      if (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker)
        return true;
      return false;
    });

    if (!nextIncomplete) {
      return;
    }

    const target = gameRefs.current[nextIncomplete.id];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRetrySave = () => {
    if (!activeDraft?.dirty) {
      return;
    }

    if (activeDraft.clearError) {
      const revision = nextCurrentPicksRevision(
        currentEntry.id,
        getDraftRevision(activeDraft),
      );
      if (!Number.isSafeInteger(revision)) return;
      const nextDrafts = {
        ...draftsByEntryId,
        [currentEntry.id]: { ...activeDraft, revision, clearError: null },
      };
      if (!persistDraftCache(storageKey, nextDrafts)) return;
      setDraftsByEntryId(nextDrafts);
    }

    setRetryKey((current) => current + 1);
  };

  if (loading || entriesLoading || (!entriesReady && !entriesError)) {
    return (
      <Panel elevated>
        <Typography variant="body1">Loading picks...</Typography>
      </Panel>
    );
  }

  if (entriesError) {
    return <EntryStartState error={entriesError} onRetry={reloadEntries} />;
  }

  if (error || picksError) {
    return (
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {picksError ? <Alert severity="error">{picksError}</Alert> : null}
        <Button
          onClick={() => {
            void reloadEntries();
            if (error) void reload();
          }}
        >
          Retry loading picks
        </Button>
      </Stack>
    );
  }

  if (picksLocked) {
    if (currentEntry && hydratedEntryId !== currentEntry.id) {
      return (
        <Panel elevated>
          <Typography variant="body1">Loading your locked picks...</Typography>
        </Panel>
      );
    }

    return (
      <LockedPicksView
        entry={currentEntry}
        games={games}
        selectionsByGameId={savedSelectionsByGameId}
        picksLockAt={picksLockAt}
      />
    );
  }

  if (!currentEntry) {
    return (
      <EntryStartState
        ready={entriesReady}
        isAdmin={isAdmin}
        creating={creatingEntry}
        createError={entryActionError}
        gameCount={games.length}
        onStart={handleCreatePickSet}
      />
    );
  }

  return (
    <Stack
      spacing={2.5}
      aria-busy={randomizeFeedback.isProcessing}
      sx={{ position: "relative" }}
    >
      <Box>
        <Typography
          variant="h3"
          sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}
        >
          My Picks
        </Typography>
        <Box
          sx={{
            width: 54,
            height: 3,
            mt: 1,
            borderRadius: 999,
            bgcolor: "primary.main",
          }}
        />
      </Box>

      {entryActionError ? (
        <Alert severity="error">{entryActionError}</Alert>
      ) : null}

      <Panel elevated sx={{ p: { xs: 2, sm: 2.25, md: 3 } }}>
        <Stack spacing={{ xs: 2, md: 2.5 }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Typography
              variant="h4"
              sx={{
                minWidth: 0,
                fontSize: { xs: "1.55rem", sm: "1.8rem", md: "2rem" },
                lineHeight: 1.15,
              }}
            >
              My {currentSeasonYear} Bowl Picks
            </Typography>
            <Chip
              label={entryStatusLabel}
              sx={{
                flexShrink: 0,
                px: { xs: 0.5, sm: 1 },
                height: { xs: 32, sm: 36 },
                bgcolor: blockSelectedEntryPickUi
                  ? alpha(theme.palette.common.white, 0.08)
                  : entryStatus === "LOCKED"
                    ? alpha(theme.palette.error.main, 0.16)
                    : entryStatus === "COMPLETE"
                      ? alpha(theme.palette.success.main, 0.16)
                      : alpha(theme.palette.common.white, 0.1),
                color: blockSelectedEntryPickUi
                  ? "text.secondary"
                  : entryStatus === "LOCKED"
                    ? "error.main"
                    : entryStatus === "COMPLETE"
                      ? "success.main"
                      : "text.primary",
                fontSize: { xs: "0.82rem", sm: "0.9rem" },
                fontWeight: 800,
              }}
            />
          </Stack>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr auto" },
              gridTemplateAreas: missingRequiredTieBreaker
                ? {
                    xs: '"count" "progress" "validation" "save"',
                    md: '"count save" "progress progress" "validation validation"',
                  }
                : {
                    xs: '"count" "progress" "save"',
                    md: '"count save" "progress progress"',
                  },
              columnGap: { md: 4 },
              rowGap: { xs: 1.5, md: 1.75 },
              alignItems: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 1.5 }}
              alignItems="baseline"
              flexWrap="wrap"
              sx={{ gridArea: "count", minWidth: 0 }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: "2.2rem", sm: "2.55rem", md: "2.75rem" },
                  lineHeight: 1,
                  color: blockSelectedEntryPickUi
                    ? "text.secondary"
                    : "text.primary",
                }}
              >
                {progressCountLabel}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {missingRequiredTieBreaker
                  ? "game picks completed"
                  : "picks completed"}
              </Typography>
            </Stack>

            <Box
              sx={{
                gridArea: "save",
                minWidth: 0,
                width: { xs: "100%", md: "auto" },
                maxWidth: { md: 420 },
                justifySelf: { xs: "start", md: "end" },
              }}
            >
              {blockSelectedEntryPickUi ? null : (
                <SaveStatus
                  state={visibleSaveState.state}
                  detail={visibleSaveState.detail}
                  onRetry={activeDraft?.dirty ? handleRetrySave : undefined}
                />
              )}
            </Box>

            <LinearProgress
              variant="determinate"
              value={blockSelectedEntryPickUi ? 0 : progressPercent}
              aria-label="Pick completion progress"
              aria-valuetext={
                blockSelectedEntryPickUi
                  ? "Loading pick progress"
                  : missingRequiredTieBreaker
                    ? `${selectedCount} of ${games.length} game picks completed; tiebreaker required`
                  : `${selectedCount} of ${games.length} picks completed`
              }
              sx={{
                gridArea: "progress",
                width: "100%",
                height: { xs: 10, md: 12 },
                borderRadius: 999,
                bgcolor: alpha(theme.palette.common.white, 0.12),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  bgcolor: "primary.main",
                  transition: "none",
                },
              }}
            />

            {missingRequiredTieBreaker ? (
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                role="alert"
                sx={{ gridArea: "validation", color: "error.main" }}
              >
                <ErrorOutlineRoundedIcon sx={{ fontSize: 19 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Tiebreaker required — enter total points to complete your
                  picks.
                </Typography>
              </Stack>
            ) : null}
          </Box>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "auto 1fr" },
              gridTemplateAreas: { xs: '"actions" "deadline"', md: '"actions deadline"' },
              gap: { xs: 1.5, md: 2.5 },
              alignItems: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ gridArea: "actions", minWidth: 0 }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={
                  randomizeFeedback.isProcessing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <ShuffleRoundedIcon />
                  )
                }
                onClick={handleRandomizePicks}
                disabled={isBulkProcessing || !pickActionsState.canRandomize}
                aria-busy={randomizeFeedback.isProcessing}
                sx={{
                  flex: { xs: "1 1 142px", sm: "0 0 auto" },
                  minWidth: { sm: 170 },
                  color: "#0d1b31",
                  bgcolor: "common.white",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: alpha("#ffffff", 0.9) },
                }}
              >
                {randomizeButtonLabel}
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepRoundedIcon />}
                onClick={() => {
                  setClearProgress(
                    buildClearProgress({
                      completed: 0,
                      total: editableGameIds.size,
                    }),
                  );
                  setClearDialogOpen(true);
                }}
                disabled={isBulkProcessing || !pickActionsState.canClear}
                sx={{
                  flex: { xs: "1 1 112px", sm: "0 0 auto" },
                  minWidth: { sm: 136 },
                  color: "error.main",
                  borderColor: (buttonTheme) =>
                    alpha(buttonTheme.palette.error.main, 0.65),
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "error.main",
                    bgcolor: (buttonTheme) =>
                      alpha(buttonTheme.palette.error.main, 0.08),
                  },
                }}
              >
                Clear All
              </Button>
            </Stack>

            {games.length > 0 ? (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  gridArea: "deadline",
                  minWidth: 0,
                  justifySelf: { xs: "start", md: "end" },
                  pl: { md: 2.5 },
                  py: { xs: 0.25, md: 0.5 },
                  borderLeft: { md: "1px solid" },
                  borderColor: { md: "divider" },
                  color: "text.secondary",
                }}
              >
                <LockRoundedIcon sx={{ fontSize: 19, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {formatCompactPickLockMessage(picksLockAt)}
                </Typography>
              </Stack>
            ) : null}
          </Box>

          {ENABLE_PICK_FILTERS ? (
            <Box
              sx={{
                display: blockSelectedEntryPickUi ? "none" : "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "minmax(0, 1fr) auto",
                },
                gap: 1.5,
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  bgcolor: "transparent",
                }}
              >
                <SegmentedButton
                  active={filter === "all"}
                  label={isSmallMobile ? "All" : "All Games"}
                  count={games.length}
                  onClick={() => setFilter("all")}
                />
                <SegmentedButton
                  active={filter === "incomplete"}
                  label={isSmallMobile ? "Missing" : "Incomplete"}
                  count={incompleteCount}
                  onClick={() => setFilter("incomplete")}
                />
                <SegmentedButton
                  active={filter === "selected"}
                  label={isSmallMobile ? "Picked" : "Selected"}
                  count={selectedCount}
                  onClick={() => setFilter("selected")}
                />
              </Box>

              <Button
                variant="outlined"
                startIcon={<TrackChangesRoundedIcon />}
                onClick={jumpToIncomplete}
                disabled={incompleteCount === 0}
                size="small"
                sx={{
                  alignSelf: { xs: "stretch", md: "center" },
                  justifySelf: { xs: "stretch", md: "end" },
                  color: "text.secondary",
                  borderColor: alpha(theme.palette.common.white, 0.14),
                  borderRadius: 999,
                }}
              >
                Jump to Incomplete
              </Button>
            </Box>
          ) : null}
        </Stack>
      </Panel>

      {blockSelectedEntryPickUi ? (
        <Panel elevated>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={22} thickness={5} />
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Loading your picks...
            </Typography>
          </Stack>
        </Panel>
      ) : (
        filteredGroups.map((group) => (
          <Box
            key={group.key}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: alpha(theme.palette.background.paper, 0.58),
            }}
          >
            <ButtonBase
              onClick={() =>
                setExpandedGroups((current) => ({
                  ...current,
                  [group.key]: !current[group.key],
                }))
              }
              sx={{
                width: "100%",
                px: { xs: 1.5, md: 2 },
                py: { xs: 1.45, md: 1.35 },
                justifyContent: "space-between",
                color: "text.primary",
                backgroundColor: alpha(theme.palette.common.white, 0.035),
                "&:focus-visible": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: "1.05rem", md: "1.1rem" } }}
                >
                  {group.label}
                </Typography>
                <Chip
                  label={`${group.games.length} game${group.games.length === 1 ? "" : "s"}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.08),
                    color: "text.secondary",
                    fontWeight: 700,
                  }}
                />
              </Stack>
              {expandedGroups[group.key] ? (
                <ExpandLessRoundedIcon />
              ) : (
                <ExpandMoreRoundedIcon />
              )}
            </ButtonBase>

            <Collapse in={expandedGroups[group.key]}>
              <Box
                sx={{
                  p: { xs: "20px 16px 24px", sm: 2.5, md: 2 },
                }}
              >
                <Stack spacing={{ xs: 3, sm: 2.5, md: 2 }}>
                  {group.games.map((game) => {
                    const selection = selectionsByGameId?.[game.id] || "";
                    const persistedSelection =
                      savedSelectionsByGameId?.[game.id] || "";
                    const metaLabel = formatPicksMetaLabel(game);
                    const gameLocked =
                      picksLocked ||
                      blockSelectedEntryPickUi ||
                      isBulkProcessing;
                    const matchupSaveState = getMatchupSaveState({
                      gameId: game.id,
                      draft: activeDraft,
                      persistedSelection,
                      saveState: visibleSaveState.state,
                    });
                    const matchupSaveMessage = !matchupSaveState
                      ? ""
                      : matchupSaveState === "saved"
                        ? "Saved"
                        : matchupSaveState === "saving"
                          ? "Saving..."
                          : matchupSaveState === "device"
                            ? "Saved to device"
                            : "Retry";

                    return (
                      <Box
                        key={game.id}
                        ref={(element) => {
                          gameRefs.current[game.id] = element;
                        }}
                        sx={{
                          overflow: "hidden",
                          p: { xs: 2, sm: 2.5, md: 2 },
                          border: "1px solid",
                          borderColor: alpha(theme.palette.common.white, 0.14),
                          borderRadius: 2,
                          borderLeft: game.isTieBreakerGame
                            ? "2px solid"
                            : "none",
                          borderLeftColor: game.isTieBreakerGame
                            ? "primary.main"
                            : "transparent",
                          backgroundColor: game.isTieBreakerGame
                            ? alpha(theme.palette.primary.main, 0.04)
                            : alpha(theme.palette.background.default, 0.22),
                          opacity: gameLocked ? 0.88 : 1,
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={1.5}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              flexWrap="wrap"
                            >
                              {game.isTieBreakerGame ? (
                                <EmojiEventsRoundedIcon
                                  sx={{ color: "primary.main", fontSize: 18 }}
                                />
                              ) : null}
                              <Typography
                                variant="overline"
                                sx={{
                                  color: "primary.main",
                                  fontSize: { xs: "0.8rem", md: "0.82rem" },
                                  lineHeight: 1.2,
                                }}
                              >
                                {game.bowl}
                              </Typography>
                              {isDesktop ? (
                                <MatchupSaveStatus
                                  state={matchupSaveState}
                                  message={matchupSaveMessage}
                                />
                              ) : null}
                            </Stack>
                            {isDesktop && metaLabel ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: "nowrap", pt: 0.15 }}
                              >
                                {metaLabel}
                              </Typography>
                            ) : null}
                          </Stack>

                          {!isDesktop ? (
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              spacing={1.5}
                              sx={{ mt: -0.15 }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  minWidth: 0,
                                  fontSize: "0.86rem",
                                  lineHeight: 1.25,
                                }}
                              >
                                {metaLabel || game.statusText || "Time TBD"}
                              </Typography>
                              <MatchupSaveStatus
                                state={matchupSaveState}
                                message={matchupSaveMessage}
                              />
                            </Stack>
                          ) : null}

                          {isDesktop ? (
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  md: "minmax(0,1fr) 72px minmax(0,1fr)",
                                  lg: "minmax(280px,1fr) 82px minmax(280px,1fr)",
                                },
                                gap: { md: 1.35 },
                                alignItems: "center",
                              }}
                            >
                              <TeamPickButton
                                disabled={gameLocked}
                                selected={selection === game.away.abbr}
                                team={game.away}
                                onClick={() =>
                                  handleTeamPick(game.id, game.away.abbr)
                                }
                              />

                              <Box
                                sx={{
                                  width: { md: 56 },
                                  height: { md: 56 },
                                  borderRadius: "50%",
                                  border: "1px solid",
                                  borderColor: alpha(
                                    theme.palette.common.white,
                                    0.18,
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "text.primary",
                                  fontWeight: 800,
                                  fontSize: { md: "1.1rem" },
                                  backgroundColor: alpha(
                                    theme.palette.background.default,
                                    0.4,
                                  ),
                                }}
                              >
                                VS
                              </Box>

                              <TeamPickButton
                                disabled={gameLocked}
                                selected={selection === game.home.abbr}
                                team={game.home}
                                onClick={() =>
                                  handleTeamPick(game.id, game.home.abbr)
                                }
                              />
                            </Box>
                          ) : (
                            <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                              <TeamPickButton
                                disabled={gameLocked}
                                selected={selection === game.away.abbr}
                                team={game.away}
                                onClick={() =>
                                  handleTeamPick(game.id, game.away.abbr)
                                }
                              />

                              <Box
                                sx={{
                                  alignSelf: "center",
                                  minWidth: 42,
                                  px: 1.2,
                                  py: 0.55,
                                  borderRadius: 999,
                                  border: "1px solid",
                                  borderColor: alpha(
                                    theme.palette.common.white,
                                    0.16,
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "text.secondary",
                                  fontWeight: 800,
                                  fontSize: "0.92rem",
                                  letterSpacing: "0.04em",
                                  backgroundColor: alpha(
                                    theme.palette.background.default,
                                    0.42,
                                  ),
                                }}
                              >
                                VS
                              </Box>

                              <TeamPickButton
                                disabled={gameLocked}
                                selected={selection === game.home.abbr}
                                team={game.home}
                                onClick={() =>
                                  handleTeamPick(game.id, game.home.abbr)
                                }
                              />
                            </Stack>
                          )}

                          {gameLocked ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Locked at the season deadline
                            </Typography>
                          ) : null}

                          {game.isTieBreakerGame ? (
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={1.5}
                              alignItems={{ xs: "stretch", md: "center" }}
                              sx={{
                                border: "1px solid",
                                borderColor: alpha(
                                  theme.palette.primary.main,
                                  0.25,
                                ),
                                borderRadius: 2,
                                p: 1.25,
                                backgroundColor: alpha(
                                  theme.palette.background.default,
                                  0.28,
                                ),
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="overline"
                                  color="primary.main"
                                >
                                  Tiebreaker
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontWeight: 700 }}
                                >
                                  Total Points Scored
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Enter the total combined points scored in the
                                  tiebreaker game.
                                </Typography>
                              </Box>
                              <TextField
                                label="Total Points"
                                type="number"
                                value={tieBreakerValue ?? ""}
                                size="small"
                                required={tieBreakerRequired}
                                error={missingRequiredTieBreaker}
                                helperText={
                                  missingRequiredTieBreaker
                                    ? "Enter a total-points prediction to complete your picks."
                                    : undefined
                                }
                                disabled={picksLocked || isBulkProcessing}
                                onChange={(event) =>
                                  handleTieBreakerChange(event.target.value)
                                }
                                inputProps={{
                                  min: 0,
                                  inputMode: "numeric",
                                  pattern: "[0-9]*",
                                }}
                                sx={{ minWidth: { xs: "100%", md: 200 } }}
                              />
                            </Stack>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        ))
      )}

      {!blockSelectedEntryPickUi && filteredGroups.length === 0 ? (
        <Panel elevated>
          <Typography variant="body1">
            No games match the current filter.
          </Typography>
        </Panel>
      ) : null}

      <PickActionOverlay
        open={randomizeFeedback.isProcessing}
        statusText={randomizeFeedback.label}
      />

      <Dialog
        open={clearDialogOpen}
        onClose={bulkOperation ? undefined : () => setClearDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="clear-picks-dialog-title"
        aria-describedby={
          bulkOperation === "clear"
            ? "clear-picks-progress-description"
            : "clear-picks-dialog-description"
        }
      >
        <DialogTitle id="clear-picks-dialog-title">
          {bulkOperation === "clear"
            ? "Clearing your picks..."
            : "Clear all picks?"}
        </DialogTitle>
        <DialogContent>
          {bulkOperation === "clear" ? (
            <Stack
              id="clear-picks-progress-description"
              spacing={1.5}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              sx={{ pt: 0.5 }}
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography variant="body2" color="text.secondary">
                    {clearProgress.completed} of {clearProgress.total} picks
                    cleared
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "primary.main", fontWeight: 800 }}
                  >
                    {clearProgress.percentage}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={clearProgress.percentage}
                  aria-label="Clear picks progress"
                  aria-valuetext={`${clearProgress.completed} of ${clearProgress.total} picks cleared`}
                  sx={{
                    height: 9,
                    borderRadius: 999,
                    bgcolor: (theme) =>
                      alpha(theme.palette.common.white, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: "primary.main",
                    },
                  }}
                />
              </Stack>
            </Stack>
          ) : (
            <DialogContentText id="clear-picks-dialog-description">
              This will remove all of your currently selected teams for unlocked
              games. This action cannot be undone.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {bulkOperation !== "clear" ? (
            <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          ) : null}
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmClearPicks}
            disabled={Boolean(bulkOperation)}
            startIcon={
              bulkOperation === "clear" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteSweepRoundedIcon />
              )
            }
          >
            {bulkOperation === "clear" ? "Clearing..." : "Clear Picks"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={bulkFeedback.open}
        autoHideDuration={5000}
        onClose={(_event, reason) => {
          if (reason !== "clickaway") {
            setBulkFeedback((current) => ({ ...current, open: false }));
          }
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={bulkFeedback.severity}
          variant="filled"
          onClose={() =>
            setBulkFeedback((current) => ({ ...current, open: false }))
          }
          sx={{ width: "100%" }}
        >
          {bulkFeedback.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

export default PicksWorkspace;
