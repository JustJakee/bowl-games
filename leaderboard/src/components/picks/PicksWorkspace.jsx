import { useEffect, useMemo, useRef, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import {
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
import { useAppData } from "../../app/AppDataContext.jsx";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useUserProfile } from "../../auth/UserProfileContext.jsx";
import { TIEBREAKER_BOWL_NAME } from "../../constants/PickMatchupCard";
import Panel from "../common/Panel";
import TeamLogo from "../common/TeamLogo";
import { useScoreboard } from "../../context/NCAAFDataContext.jsx";
import { calculatePickSetStatus, PICK_SET_STATUS } from "../../data/picksRepository";
import {
  formatPicksDateLabel,
  formatPicksMetaLabel,
  getTeamIdentity,
} from "../../utils/picksGameUtils";
import { formatDeadline } from "../../utils/countdown";

const STORAGE_KEY_PREFIX = "bobs-bowl-games-picks-ui";

const createEntryId = () =>
  `local-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEntryName = (username, index) =>
  username ? `${username}'s Entry ${index}` : `Entry ${index}`;

const normalizeColor = (value) => {
  if (!value) return "";
  return value.startsWith("#") ? value : `#${value}`;
};

const buildPicksGames = (games = []) =>
  (games || [])
    .map((game, index) => {
      const awayIdentity = getTeamIdentity(game?.away?.displayName, game?.away?.abbr);
      const homeIdentity = getTeamIdentity(game?.home?.displayName, game?.home?.abbr);
      const startTime = game?.startDate ? new Date(game.startDate).getTime() : Number.MAX_SAFE_INTEGER;

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
        isTieBreakerGame: String(game?.bowl || "").trim() === TIEBREAKER_BOWL_NAME,
        away: {
          id: game?.away?.id || `${game?.id}-away`,
          abbr: game?.away?.abbr || "AWAY",
          displayName: game?.away?.displayName || game?.away?.abbr || "Away",
          school: awayIdentity.school,
          mascot: awayIdentity.mascot,
          rank: game?.away?.rank && game.away.rank < 99 ? game.away.rank : null,
          logo: game?.away?.logo || "",
          color: normalizeColor(game?.away?.color || game?.away?.alternateColor),
        },
        home: {
          id: game?.home?.id || `${game?.id}-home`,
          abbr: game?.home?.abbr || "HOME",
          displayName: game?.home?.displayName || game?.home?.abbr || "Home",
          school: homeIdentity.school,
          mascot: homeIdentity.mascot,
          rank: game?.home?.rank && game.home.rank < 99 ? game.home.rank : null,
          logo: game?.home?.logo || "",
          color: normalizeColor(game?.home?.color || game?.home?.alternateColor),
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

const SegmentedButton = ({ active, count, label, onClick }) => {
  return (
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
};

const SaveStatus = ({ state, message }) => {
  const icon =
    state === "error" ? (
      <ErrorOutlineRoundedIcon fontSize="small" />
    ) : state === "saving" ? (
      <CloudDoneRoundedIcon fontSize="small" />
    ) : (
      <CloudDoneRoundedIcon fontSize="small" />
    );

  const color =
    state === "error" ? "error.main" : state === "saving" ? "text.secondary" : "success.main";

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color }}>
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {message}
      </Typography>
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
    ) : state === "saving" ? (
      <CloudDoneRoundedIcon sx={{ fontSize: 14 }} />
    ) : (
      <CloudDoneRoundedIcon sx={{ fontSize: 14 }} />
    );

  const color =
    state === "error" ? "error.main" : state === "saving" ? "text.secondary" : "success.main";

  return (
    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ color, minWidth: 0 }}>
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

const TeamPickButton = ({ disabled, selected, team, onClick }) => {
  return (
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
        boxShadow: selected ? "0 0 0 1px rgba(255,203,5,0.22), 0 0 20px rgba(255,203,5,0.12)" : "none",
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
        <Stack direction="row" alignItems="center" spacing={1.35} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1.35} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
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
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
                {team.abbr}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </ButtonBase>
  );
};

const PicksWorkspace = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { email } = useAuth();
  const { profile } = useUserProfile();
  const { allGames, loading, error } = useScoreboard();
  const {
    currentEntry,
    defaultContactEmail,
    picksLoading,
    saveCurrentPicks,
    savedSelectionsByGameId,
    tieBreakerRequired,
  } = useAppData();
  const storageKey = `${STORAGE_KEY_PREFIX}:${profile?.id || email || "default"}`;
  const gameRefs = useRef({});
  const savedSignaturesRef = useRef({});
  const initializedRef = useRef(false);
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState("");
  const [filter, setFilter] = useState("all");
  const [saveState, setSaveState] = useState({
    state: "saved",
    message: "All changes saved",
  });
  const [expandedGroups, setExpandedGroups] = useState({});

  const games = useMemo(() => buildPicksGames(allGames || []), [allGames]);
  const groupedGames = useMemo(() => buildGroups(games), [games]);
  const lockDeadline = useMemo(() => {
    const firstKickoff = games.find((game) => Number.isFinite(game.startTime))?.startDate;
    return firstKickoff || "";
  }, [games]);
  const isLocked = Boolean(lockDeadline) && new Date(lockDeadline).getTime() <= Date.now();

  useEffect(() => {
    const nextExpanded = {};
    groupedGames.forEach((group) => {
      nextExpanded[group.key] = expandedGroups[group.key] ?? true;
    });
    setExpandedGroups(nextExpanded);
  }, [groupedGames]);

  useEffect(() => {
    if (loading || picksLoading) {
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    } catch {
      parsed = null;
    }

    let nextEntries = Array.isArray(parsed?.entries) ? parsed.entries.filter(Boolean) : [];
    const serverIndex = nextEntries.findIndex((entry) => entry.serverBacked);
    const existingPrimaryEntry =
      serverIndex >= 0 ? nextEntries[serverIndex] : null;
    const hasBackendEntry = Boolean(currentEntry?.id);
    const hasBackendSelections =
      Object.keys(savedSelectionsByGameId || {}).length > 0;
    const hasBackendTieBreaker =
      currentEntry?.tieBreakerValue !== null &&
      currentEntry?.tieBreakerValue !== undefined &&
      String(currentEntry.tieBreakerValue).trim() !== "";
    const fallbackName =
      currentEntry?.entryName ||
      existingPrimaryEntry?.name ||
      `${profile?.username || "My"} Main Entry`;
    const primaryEntry = {
      ...(existingPrimaryEntry || {}),
      id: currentEntry?.id || existingPrimaryEntry?.id || "entry-primary",
      name: hasBackendEntry
        ? currentEntry?.entryName || fallbackName
        : fallbackName,
      selectionsByGameId: hasBackendSelections
        ? savedSelectionsByGameId
        : existingPrimaryEntry?.selectionsByGameId || {},
      tieBreakerValue: hasBackendTieBreaker
        ? String(currentEntry.tieBreakerValue)
        : existingPrimaryEntry?.tieBreakerValue || "",
      serverBacked: true,
      // Until backend entry persistence is live, keep the primary entry local-first.
      localOnly: !hasBackendEntry,
    };

    if (serverIndex >= 0) {
      nextEntries[serverIndex] = primaryEntry;
    } else {
      nextEntries = [primaryEntry, ...nextEntries];
    }

    if (nextEntries.length === 0) {
      nextEntries = [primaryEntry];
    }

    const nextActiveEntryId =
      nextEntries.some((entry) => entry.id === parsed?.activeEntryId)
        ? parsed.activeEntryId
        : nextEntries[0].id;

    const nextSavedSignatures = {};
    nextEntries.forEach((entry) => {
      nextSavedSignatures[entry.id] = JSON.stringify({
        name: entry.name,
        selectionsByGameId: entry.selectionsByGameId || {},
        tieBreakerValue: entry.tieBreakerValue || "",
      });
    });

    savedSignaturesRef.current = nextSavedSignatures;
    initializedRef.current = true;
    setEntries(nextEntries);
    setActiveEntryId(nextActiveEntryId);
    setSaveState({ state: "saved", message: "All changes saved" });
  }, [
    currentEntry?.entryName,
    currentEntry?.id,
    currentEntry?.tieBreakerValue,
    loading,
    picksLoading,
    profile?.id,
    profile?.username,
    savedSelectionsByGameId,
    storageKey,
  ]);

  useEffect(() => {
    if (!initializedRef.current || entries.length === 0) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeEntryId,
        entries,
      })
    );
  }, [activeEntryId, entries, storageKey]);

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId) || entries[0] || null,
    [activeEntryId, entries]
  );

  const hasTieBreaker = activeEntry?.tieBreakerValue === 0 || Boolean(String(activeEntry?.tieBreakerValue || "").trim());
  const entryStatus = isLocked
    ? "LOCKED"
    : calculatePickSetStatus({
        requiredGameIds: games.map((game) => game.id),
        selectionsByGameId: activeEntry?.selectionsByGameId || {},
        tieBreakerRequired,
        tieBreakerValue: activeEntry?.tieBreakerValue,
      }) === PICK_SET_STATUS.COMPLETE
      ? "COMPLETE"
      : "DRAFT";

  const selectedCount = games.filter((game) =>
    Boolean(activeEntry?.selectionsByGameId?.[game.id])
  ).length;
  const incompleteCount = games.filter((game) => {
    const hasSelection = Boolean(activeEntry?.selectionsByGameId?.[game.id]);
    if (!hasSelection) return true;
    if (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker) return true;
    return false;
  }).length;
  const progressPercent = games.length > 0 ? Math.round((selectedCount / games.length) * 100) : 0;

  const filteredGames = useMemo(() => {
    if (!activeEntry) return games;

    return games.filter((game) => {
      const hasSelection = Boolean(activeEntry.selectionsByGameId?.[game.id]);
      const isIncomplete = !hasSelection || (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker);

      if (filter === "selected") return hasSelection;
      if (filter === "incomplete") return isIncomplete;
      return true;
    });
  }, [activeEntry, filter, games, hasTieBreaker, tieBreakerRequired]);

  const filteredGroups = useMemo(() => buildGroups(filteredGames), [filteredGames]);

  const updateActiveEntry = (updater) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.id !== activeEntryId) return entry;
        return typeof updater === "function" ? updater(entry) : { ...entry, ...updater };
      })
    );
  };

  useEffect(() => {
    if (!initializedRef.current || !activeEntry) {
      return;
    }

    const signature = JSON.stringify({
      name: activeEntry.name,
      selectionsByGameId: activeEntry.selectionsByGameId || {},
      tieBreakerValue: activeEntry.tieBreakerValue || "",
    });

    if (savedSignaturesRef.current[activeEntry.id] === signature) {
      return;
    }

    setSaveState({ state: "saving", message: "Saving..." });

    const timeoutId = window.setTimeout(async () => {
      if (activeEntry.localOnly) {
        savedSignaturesRef.current[activeEntry.id] = signature;
        setSaveState({ state: "saved", message: "All changes saved" });
        return;
      }

      try {
        await saveCurrentPicks({
          entryName: activeEntry.name,
          contactEmail: defaultContactEmail || email || "",
          selectionsByGameId: activeEntry.selectionsByGameId || {},
          tieBreakerValue: activeEntry.tieBreakerValue,
          userProfileId: profile?.id,
        });

        savedSignaturesRef.current[activeEntry.id] = signature;
        setSaveState({ state: "saved", message: "All changes saved" });
      } catch (saveError) {
        setSaveState({
          state: "error",
          message: saveError?.message || "Unable to save. Retry",
        });
      }
    }, 550);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeEntry,
    defaultContactEmail,
    email,
    profile?.id,
    saveCurrentPicks,
  ]);

  const handleTeamPick = (gameId, teamCode) => {
    if (isLocked) {
      return;
    }

    updateActiveEntry((entry) => ({
      ...entry,
      selectionsByGameId: {
        ...(entry.selectionsByGameId || {}),
        [gameId]: teamCode,
      },
    }));
  };

  const handleTieBreakerChange = (value) => {
    if (isLocked) {
      return;
    }

    updateActiveEntry((entry) => ({
      ...entry,
      tieBreakerValue: value,
    }));
  };

  const handleNewEntry = () => {
    const nextIndex = entries.length + 1;
    const newEntry = {
      id: createEntryId(),
      name: buildEntryName(profile?.username, nextIndex),
      selectionsByGameId: {},
      tieBreakerValue: "",
      localOnly: true,
      serverBacked: false,
    };

    savedSignaturesRef.current[newEntry.id] = JSON.stringify({
      name: newEntry.name,
      selectionsByGameId: {},
      tieBreakerValue: "",
    });
    setEntries((currentEntries) => [...currentEntries, newEntry]);
    setActiveEntryId(newEntry.id);
    setSaveState({ state: "saved", message: "All changes saved" });
  };

  const jumpToIncomplete = () => {
    const nextIncomplete = games.find((game) => {
      const hasSelection = Boolean(activeEntry?.selectionsByGameId?.[game.id]);
      if (!hasSelection) return true;
      if (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker) return true;
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

  if (loading || picksLoading || !activeEntry) {
    return (
      <Panel elevated>
        <Typography variant="body1">Loading picks...</Typography>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel elevated role="alert">
        <Typography variant="body1" color="error.main">
          {error}
        </Typography>
      </Panel>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}>
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

      <Panel elevated sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 1.1fr) minmax(280px, 1.5fr) 180px" },
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
                  value={activeEntryId}
                  onChange={(event) => setActiveEntryId(event.target.value)}
                  fullWidth
                  size="small"
                  disabled={entries.length === 0}
                  sx={{
                    minHeight: 44,
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 700,
                    },
                  }}
                >
                  {entries.map((entry) => (
                    <MenuItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleNewEntry}
                  sx={{ whiteSpace: "nowrap", alignSelf: { xs: "stretch", sm: "auto" } }}
                >
                  New Entry
                </Button>
              </Stack>
              <TextField
                label="Entry Name"
                value={activeEntry.name}
                size="small"
                onChange={(event) =>
                  updateActiveEntry({
                    name: event.target.value,
                  })
                }
                disabled={isLocked}
              />
            </Stack>

            <Stack spacing={1.15} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Picks Progress
              </Typography>
              <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                <Typography variant="h4" sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}>
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
              {lockDeadline ? (
                <Typography variant="body2" color="text.secondary">
                  Picks lock on {formatDeadline(lockDeadline)}
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

      {filteredGroups.map((group) => (
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
              <Typography variant="h6" sx={{ fontSize: { xs: "1.05rem", md: "1.1rem" } }}>
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
            {expandedGroups[group.key] ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          </ButtonBase>

          <Collapse in={expandedGroups[group.key]}>
            <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
              {group.games.map((game) => {
                const selection = activeEntry.selectionsByGameId?.[game.id] || "";
                const hasSelection = Boolean(selection);
                const gameIncomplete =
                  !hasSelection || (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker);
                const metaLabel = formatPicksMetaLabel(game);
                const matchupSaveState = hasSelection ? "saved" : "";
                const matchupSaveMessage = hasSelection ? "Saved" : "";

                return (
                  <Box
                    key={game.id}
                    ref={(element) => {
                      gameRefs.current[game.id] = element;
                    }}
                    sx={{
                      px: { xs: 1.4, md: 1.75 },
                      py: { xs: 1.7, md: 1.6 },
                      borderLeft: game.isTieBreakerGame ? "2px solid" : "none",
                      borderColor: game.isTieBreakerGame ? "primary.main" : "transparent",
                      backgroundColor: game.isTieBreakerGame
                        ? alpha(theme.palette.primary.main, 0.04)
                        : "transparent",
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1.5}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {game.isTieBreakerGame ? (
                            <EmojiEventsRoundedIcon sx={{ color: "primary.main", fontSize: 18 }} />
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
                            disabled={isLocked}
                            selected={selection === game.away.abbr}
                            team={game.away}
                            onClick={() => handleTeamPick(game.id, game.away.abbr)}
                          />

                          <Box
                            sx={{
                              width: { md: 56 },
                              height: { md: 56 },
                              borderRadius: "50%",
                              border: "1px solid",
                              borderColor: alpha(theme.palette.common.white, 0.18),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "text.primary",
                              fontWeight: 800,
                              fontSize: { md: "1.1rem" },
                              backgroundColor: alpha(theme.palette.background.default, 0.4),
                            }}
                          >
                            VS
                          </Box>

                          <TeamPickButton
                            disabled={isLocked}
                            selected={selection === game.home.abbr}
                            team={game.home}
                            onClick={() => handleTeamPick(game.id, game.home.abbr)}
                          />
                        </Box>
                      ) : (
                        <Stack spacing={1.1} sx={{ pt: 0.5 }}>
                          <TeamPickButton
                            disabled={isLocked}
                            selected={selection === game.away.abbr}
                            team={game.away}
                            onClick={() => handleTeamPick(game.id, game.away.abbr)}
                          />

                          <Box
                            sx={{
                              alignSelf: "center",
                              minWidth: 42,
                              px: 1.2,
                              py: 0.55,
                              borderRadius: 999,
                              border: "1px solid",
                              borderColor: alpha(theme.palette.common.white, 0.16),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "text.secondary",
                              fontWeight: 800,
                              fontSize: "0.92rem",
                              letterSpacing: "0.04em",
                              backgroundColor: alpha(theme.palette.background.default, 0.42),
                            }}
                          >
                            VS
                          </Box>

                          <TeamPickButton
                            disabled={isLocked}
                            selected={selection === game.home.abbr}
                            team={game.home}
                            onClick={() => handleTeamPick(game.id, game.home.abbr)}
                          />
                        </Stack>
                      )}

                      {game.isTieBreakerGame ? (
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          spacing={1.5}
                          alignItems={{ xs: "stretch", md: "center" }}
                          sx={{
                            border: "1px solid",
                            borderColor: alpha(theme.palette.primary.main, 0.25),
                            borderRadius: 2,
                            p: 1.25,
                            backgroundColor: alpha(theme.palette.background.default, 0.28),
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="overline" color="primary.main">
                              Tiebreaker
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                              Total Points Scored
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Enter the total combined points scored in the tiebreaker game.
                            </Typography>
                          </Box>
                          <TextField
                            label="Total Points"
                            type="number"
                            value={activeEntry.tieBreakerValue ?? ""}
                            size="small"
                            disabled={isLocked}
                            onChange={(event) => handleTieBreakerChange(event.target.value)}
                            inputProps={{ min: 0, inputMode: "numeric", pattern: "[0-9]*" }}
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
      ))}

      {filteredGroups.length === 0 ? (
        <Panel elevated>
          <Typography variant="body1">No games match the current filter.</Typography>
        </Panel>
      ) : null}
    </Stack>
  );
};

export default PicksWorkspace;
