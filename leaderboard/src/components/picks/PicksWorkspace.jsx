import { useEffect, useMemo, useRef, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../../app/AppDataContext.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useUserProfile } from "../../auth/UserProfileContext.jsx";
import { TIEBREAKER_BOWL_NAME } from "../../constants/PickMatchupCard";
import Panel from "../common/Panel";
import TeamLogo from "../common/TeamLogo";
import { useScoreboard } from "../../context/NCAAFDataContext.jsx";
import {
  calculatePickSetStatus,
  isGameLocked,
  PICK_SET_STATUS,
} from "../../data/picksRepository";
import {
  formatPicksDateLabel,
  formatPicksMetaLabel,
  getTeamIdentity,
} from "../../utils/picksGameUtils";

const STORAGE_KEY_PREFIX = "bobs-bowl-games-picks-drafts";

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

const buildEntryName = (username, index) =>
  username ? `${username}'s Entry ${index}` : `Entry ${index}`;

const buildNextEntryName = (entries, username) => {
  const existingNames = new Set(
    (entries || []).map((entry) =>
      String(entry?.entryName || "").toLowerCase(),
    ),
  );

  let index = entries.length + 1;
  let candidate = buildEntryName(username, index);

  while (existingNames.has(candidate.toLowerCase())) {
    index += 1;
    candidate = buildEntryName(username, index);
  }

  return candidate;
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
        startTimeText: game?.startTimeText || game?.statusText || "Time TBD",
        statusText: game?.statusText || "",
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
    const key = game?.startDate?.slice(0, 10) || game.startDateLabel;
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
      minHeight: 46,
      px: 2,
      gap: 1,
      justifyContent: "center",
      color: active ? "primary.contrastText" : "text.primary",
      backgroundColor: active ? "primary.main" : "transparent",
      borderRight: "1px solid",
      borderColor: "divider",
      "&:last-of-type": { borderRight: "none" },
      "&:hover": {
        backgroundColor: active
          ? "primary.main"
          : (theme) => alpha(theme.palette.common.white, 0.04),
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
        bgcolor: active
          ? alpha("#08111f", 0.75)
          : (theme) => alpha(theme.palette.common.white, 0.08),
        color: active ? "primary.contrastText" : "text.primary",
        fontWeight: 700,
      }}
    />
  </ButtonBase>
);

const SaveStatus = ({ state, message, detail, onRetry }) => {
  const icon =
    state === "error" ? (
      <ErrorOutlineRoundedIcon fontSize="small" />
    ) : state === "device" ? (
      <SaveRoundedIcon fontSize="small" />
    ) : (
      <CloudDoneRoundedIcon fontSize="small" />
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
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {message}
        </Typography>
        {onRetry && (state === "device" || state === "error") ? (
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
      {detail ? (
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
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
            sx={{
              bgcolor: selected
                ? alpha(team.color || "#ffcb05", 0.16)
                : "rgba(255,255,255,0.08)",
            }}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { email } = useAuth();
  const { profile } = useUserProfile();
  const { allGames, loading, error } = useScoreboard();
  const {
    activeEntryId,
    createSeasonEntry,
    currentEntry,
    currentSeasonId,
    defaultContactEmail,
    entries,
    entriesError,
    entriesLoading,
    picksLoading,
    picksError,
    saveCurrentPicks,
    savedSelectionsByGameId,
    setActiveEntryId,
    tieBreakerGameId,
    tieBreakerRequired,
  } = useAppData();
  const storageKey = buildDraftStorageKey(
    profile?.id || email,
    currentSeasonId,
  );
  const gameRefs = useRef({});
  const saveRequestIdRef = useRef(0);
  const [draftsByEntryId, setDraftsByEntryId] = useState({});
  const [filter, setFilter] = useState("all");
  const [saveState, setSaveState] = useState({
    state: "saved",
    message: "Saved to account",
    detail: "",
  });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [retryKey, setRetryKey] = useState(0);
  const [entryActionError, setEntryActionError] = useState("");
  const [creatingEntry, setCreatingEntry] = useState(false);

  const games = useMemo(() => buildPicksGames(allGames || []), [allGames]);
  const groupedGames = useMemo(() => buildGroups(games), [games]);
  const tieBreakerGame = useMemo(
    () => games.find((game) => game.id === tieBreakerGameId) || null,
    [games, tieBreakerGameId],
  );

  useEffect(() => {
    setDraftsByEntryId(readDraftCache(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeDraftCache(storageKey, draftsByEntryId);
  }, [draftsByEntryId, storageKey]);

  useEffect(() => {
    const nextExpanded = {};
    groupedGames.forEach((group) => {
      nextExpanded[group.key] = expandedGroups[group.key] ?? true;
    });
    setExpandedGroups(nextExpanded);
  }, [groupedGames]);

  useEffect(() => {
    if (entriesLoading) {
      return;
    }

    const requestedEntryId = searchParams.get("entry");

    if (
      requestedEntryId &&
      entries.some((entry) => entry.id === requestedEntryId)
    ) {
      if (requestedEntryId !== activeEntryId) {
        setActiveEntryId(requestedEntryId);
      }
      return;
    }

    if (!requestedEntryId && activeEntryId) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("entry", activeEntryId);
          return next;
        },
        { replace: true },
      );
    }
  }, [
    activeEntryId,
    entries,
    entriesLoading,
    searchParams,
    setActiveEntryId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!currentEntry) {
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
      dirty: false,
    };

    setDraftsByEntryId((currentDrafts) => {
      const existingDraft = currentDrafts[currentEntry.id];

      if (!existingDraft || !existingDraft.dirty) {
        return {
          ...currentDrafts,
          [currentEntry.id]: backendDraft,
        };
      }

      return currentDrafts;
    });

    setSaveState((currentState) => {
      const existingDraft = draftsByEntryId[currentEntry.id];

      if (existingDraft?.dirty) {
        return {
          state: "device",
          message: "Saved to device",
          detail: "Unsynced changes are waiting to be retried.",
        };
      }

      return {
        state: "saved",
        message: "Saved to account",
        detail: "",
      };
    });
  }, [currentEntry, draftsByEntryId, savedSelectionsByGameId]);

  const activeDraft = currentEntry
    ? draftsByEntryId[currentEntry.id] || null
    : null;

  const selectedCount = games.filter((game) =>
    Boolean(activeDraft?.selectionsByGameId?.[game.id]),
  ).length;
  const hasTieBreaker =
    activeDraft?.tieBreakerValue === 0 ||
    Boolean(String(activeDraft?.tieBreakerValue || "").trim());
  const incompleteCount = games.filter((game) => {
    const hasSelection = Boolean(activeDraft?.selectionsByGameId?.[game.id]);
    if (!hasSelection) return true;
    if (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker)
      return true;
    return false;
  }).length;
  const progressPercent =
    games.length > 0 ? Math.round((selectedCount / games.length) * 100) : 0;
  const allGamesLocked =
    games.length > 0 && games.every((game) => isGameLocked(game.startDate));
  const entryStatus = allGamesLocked
    ? "LOCKED"
    : calculatePickSetStatus({
          requiredGameIds: games.map((game) => game.id),
          selectionsByGameId: activeDraft?.selectionsByGameId || {},
          tieBreakerRequired,
          tieBreakerValue: activeDraft?.tieBreakerValue,
        }) === PICK_SET_STATUS.COMPLETE
      ? "COMPLETE"
      : "DRAFT";

  const filteredGames = useMemo(() => {
    if (!activeDraft) return games;

    return games.filter((game) => {
      const hasSelection = Boolean(activeDraft.selectionsByGameId?.[game.id]);
      const isIncomplete =
        !hasSelection ||
        (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker);

      if (filter === "selected") return hasSelection;
      if (filter === "incomplete") return isIncomplete;
      return true;
    });
  }, [activeDraft, filter, games, hasTieBreaker, tieBreakerRequired]);

  const filteredGroups = useMemo(
    () => buildGroups(filteredGames),
    [filteredGames],
  );

  useEffect(() => {
    if (!currentEntry || !activeDraft?.dirty) {
      return;
    }

    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    setSaveState({
      state: "saving",
      message: "Saving...",
      detail: "",
    });

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await saveCurrentPicks({
          entryId: currentEntry.id,
          entryName: activeDraft.entryName,
          contactEmail: defaultContactEmail || email || "",
          selectionsByGameId: activeDraft.selectionsByGameId || {},
          tieBreakerValue: activeDraft.tieBreakerValue,
          userProfileId: profile?.id,
        });

        if (saveRequestIdRef.current !== requestId) {
          return;
        }

        setDraftsByEntryId((currentDrafts) => ({
          ...currentDrafts,
          [currentEntry.id]: {
            entryName: result.entry.entryName,
            selectionsByGameId: result.selectionsByGameId,
            tieBreakerValue:
              result.entry.tieBreakerValue === null ||
              result.entry.tieBreakerValue === undefined
                ? ""
                : String(result.entry.tieBreakerValue),
            dirty: false,
          },
        }));
        setSaveState({
          state: "saved",
          message: "Saved to account",
          detail: "",
        });
      } catch (saveError) {
        if (saveRequestIdRef.current !== requestId) {
          return;
        }

        setSaveState({
          state: "device",
          message: "Saved to device",
          detail:
            saveError?.message || "Backend save failed. Retry is required.",
        });
      }
    }, 550);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeDraft,
    currentEntry,
    defaultContactEmail,
    email,
    profile?.id,
    retryKey,
    saveCurrentPicks,
  ]);

  const updateActiveDraft = (updater) => {
    if (!currentEntry) {
      return;
    }

    setDraftsByEntryId((currentDrafts) => {
      const existingDraft = currentDrafts[currentEntry.id] || {
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
        [currentEntry.id]: {
          ...nextDraft,
          dirty: true,
        },
      };
    });
  };

  const handleTeamPick = (gameId, teamCode) => {
    const game = games.find((item) => item.id === gameId);

    if (game && isGameLocked(game.startDate)) {
      return;
    }

    updateActiveDraft((draft) => ({
      ...draft,
      selectionsByGameId: {
        ...(draft.selectionsByGameId || {}),
        [gameId]: teamCode,
      },
    }));
  };

  const handleTieBreakerChange = (value) => {
    if (tieBreakerGame && isGameLocked(tieBreakerGame.startDate)) {
      return;
    }

    updateActiveDraft((draft) => ({
      ...draft,
      tieBreakerValue: value,
    }));
  };

  const handleNewEntry = async () => {
    setCreatingEntry(true);
    setEntryActionError("");

    try {
      const createdEntry = await createSeasonEntry({
        entryName: buildNextEntryName(entries, profile?.username),
        userProfileId: profile?.id,
      });

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("entry", createdEntry.id);
          return next;
        },
        { replace: true },
      );
    } catch (error) {
      setEntryActionError(error?.message || "Unable to create a new entry.");
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

    setRetryKey((current) => current + 1);
  };

  if (
    loading ||
    entriesLoading ||
    (picksLoading && currentEntry && !activeDraft)
  ) {
    return (
      <Panel elevated>
        <Typography variant="body1">Loading picks...</Typography>
      </Panel>
    );
  }

  if (error || entriesError || picksError) {
    return (
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {entriesError ? <Alert severity="error">{entriesError}</Alert> : null}
        {picksError ? <Alert severity="error">{picksError}</Alert> : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
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

      <Panel elevated sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(280px, 1.1fr) minmax(280px, 1.5fr) 180px",
              },
              gap: { xs: 2, md: 2.25 },
              alignItems: "start",
            }}
          >
            <Stack spacing={1.25}>
              <Typography variant="overline" color="text.secondary">
                My Entry
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Select
                  value={activeEntryId || ""}
                  onChange={(event) => {
                    const nextEntryId = event.target.value;
                    setActiveEntryId(nextEntryId);
                    setSearchParams(
                      (current) => {
                        const next = new URLSearchParams(current);
                        next.set("entry", nextEntryId);
                        return next;
                      },
                      { replace: true },
                    );
                  }}
                  fullWidth
                  size="small"
                  disabled={entries.length === 0}
                  displayEmpty
                  sx={{
                    minHeight: 44,
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 700,
                    },
                  }}
                >
                  {entries.length === 0 ? (
                    <MenuItem value="" disabled>
                      No entries yet
                    </MenuItem>
                  ) : null}
                  {entries.map((entry) => (
                    <MenuItem key={entry.id} value={entry.id}>
                      {entry.entryName}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleNewEntry}
                  disabled={creatingEntry || !currentSeasonId}
                  sx={{
                    whiteSpace: "nowrap",
                    alignSelf: { xs: "stretch", sm: "auto" },
                  }}
                >
                  {creatingEntry ? "Creating..." : "New Entry"}
                </Button>
              </Stack>
              <TextField
                label="Entry Name"
                value={activeDraft?.entryName || ""}
                size="small"
                onChange={(event) =>
                  updateActiveDraft({
                    entryName: event.target.value,
                  })
                }
                disabled={!currentEntry}
              />
            </Stack>

            <Stack spacing={1.15} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Picks Progress
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="baseline"
                flexWrap="wrap"
              >
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}
                >
                  {selectedCount} / {games.length}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Picks Complete
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    flex: 1,
                    height: 12,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.common.white, 0.12),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: "primary.main",
                    },
                  }}
                />
                <Typography variant="h6">{progressPercent}%</Typography>
              </Stack>
              <SaveStatus
                state={saveState.state}
                message={saveState.message}
                detail={saveState.detail}
                onRetry={handleRetrySave}
              />
            </Stack>

            <Stack spacing={1.1}>
              <Typography variant="overline" color="text.secondary">
                Entry Status
              </Typography>
              <Chip
                label={entryStatus}
                sx={{
                  alignSelf: "flex-start",
                  px: 1,
                  height: 34,
                  bgcolor:
                    entryStatus === "LOCKED"
                      ? alpha(theme.palette.error.main, 0.16)
                      : entryStatus === "COMPLETE"
                        ? alpha(theme.palette.success.main, 0.16)
                        : alpha(theme.palette.common.white, 0.08),
                  color:
                    entryStatus === "LOCKED"
                      ? "error.main"
                      : entryStatus === "COMPLETE"
                        ? "success.main"
                        : "text.primary",
                  fontWeight: 800,
                }}
              />
              {games.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Per-game locking starts on{" "}
                  {games[0]?.startDateLabel || "the first kickoff"}.
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              gap: 1.5,
              alignItems: "stretch",
            }}
          >
            <Box
              sx={{
                display: "flex",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
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
              }}
            >
              Jump to Incomplete
            </Button>
          </Box>
        </Stack>
      </Panel>

      {entries.length === 0 ? (
        <Panel elevated>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Create your first entry to start making picks.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Entries are stored in your account for the active `test26` season.
          </Typography>
        </Panel>
      ) : null}

      {entries.length > 0
        ? filteredGroups.map((group) => (
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
                <Stack
                  divider={
                    <Box
                      sx={{ borderTop: "1px solid", borderColor: "divider" }}
                    />
                  }
                >
                  {group.games.map((game) => {
                    const selection =
                      activeDraft?.selectionsByGameId?.[game.id] || "";
                    const persistedSelection =
                      savedSelectionsByGameId?.[game.id] || "";
                    const metaLabel = formatPicksMetaLabel(game);
                    const gameLocked = isGameLocked(game.startDate);
                    const matchupSaveState = !selection
                      ? ""
                      : selection === persistedSelection
                        ? "saved"
                        : saveState.state;
                    const matchupSaveMessage = !selection
                      ? ""
                      : selection === persistedSelection
                        ? "Saved"
                        : saveState.state === "saving"
                          ? "Saving..."
                          : saveState.state === "device"
                            ? "Saved to device"
                            : "Retry";

                    return (
                      <Box
                        key={game.id}
                        ref={(element) => {
                          gameRefs.current[game.id] = element;
                        }}
                        sx={{
                          px: { xs: 1.4, md: 1.75 },
                          py: { xs: 1.7, md: 1.6 },
                          borderLeft: game.isTieBreakerGame
                            ? "2px solid"
                            : "none",
                          borderColor: game.isTieBreakerGame
                            ? "primary.main"
                            : "transparent",
                          backgroundColor: game.isTieBreakerGame
                            ? alpha(theme.palette.primary.main, 0.04)
                            : "transparent",
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
                            <Stack spacing={1.1} sx={{ pt: 0.5 }}>
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
                              Locked at kickoff
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
                                value={activeDraft?.tieBreakerValue ?? ""}
                                size="small"
                                disabled={Boolean(
                                  tieBreakerGame &&
                                  isGameLocked(tieBreakerGame.startDate),
                                )}
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
              </Collapse>
            </Box>
          ))
        : null}

      {entries.length > 0 && filteredGroups.length === 0 ? (
        <Panel elevated>
          <Typography variant="body1">
            No games match the current filter.
          </Typography>
        </Panel>
      ) : null}
    </Stack>
  );
};

export default PicksWorkspace;
