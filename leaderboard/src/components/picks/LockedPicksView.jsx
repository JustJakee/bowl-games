// UI — PICKS — LOCKED SEASON REPORT
import { useMemo, useState } from "react";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  ButtonBase,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import TeamLogo from "../common/TeamLogo";
import PaymentStatusChip from "../common/PaymentStatusChip";
import {
  buildLockedPickItems,
  getPickStatusCounts,
  groupLockedPickItems,
} from "./lockedPicksStatus";

const STATUS_DETAILS = {
  correct: { label: "Correct", color: "success.main", icon: CheckCircleOutlineRoundedIcon, empty: "No correct picks yet. Completed winning picks will appear here." },
  incorrect: { label: "Incorrect", color: "error.main", icon: CloseRoundedIcon, empty: "No incorrect picks." },
  live: { label: "Live", color: "primary.main", icon: RadioButtonCheckedRoundedIcon, empty: "No live games right now." },
  upcoming: { label: "Upcoming", color: "secondary.main", icon: ScheduleRoundedIcon, empty: "No upcoming picks remain." },
  canceled: { label: "Canceled", color: "warning.main", icon: WarningAmberRoundedIcon, empty: "No canceled picks." },
  postponed: { label: "Postponed", color: "warning.main", icon: WarningAmberRoundedIcon, empty: "No postponed picks." },
};

const formatUpcoming = (game) => {
  if (!game?.startDate) return game?.statusText || "Kickoff TBD";
  const date = new Date(game.startDate);
  if (Number.isNaN(date.getTime())) return game?.startTimeText || "Kickoff TBD";
  return `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)} · ${game.startTimeText || "Time TBD"}`;
};

const formatResult = (item) => {
  const { game, status } = item;
  if (status === "upcoming") return formatUpcoming(game);
  if (status === "canceled" || status === "postponed") return game.statusText || STATUS_DETAILS[status].label;
  const awayScore = game?.away?.score;
  const homeScore = game?.home?.score;
  const score = awayScore !== "" && awayScore !== undefined && homeScore !== "" && homeScore !== undefined
    ? `${awayScore} – ${homeScore}`
    : "Score unavailable";
  return status === "live" ? `${score} · ${game.statusText || "Live"}` : `${score} · Final`;
};

const SummaryStat = ({ status, count }) => {
  const detail = STATUS_DETAILS[status];
  const Icon = detail.icon;
  return (
    <Stack spacing={0.25} alignItems="center" sx={{ minWidth: { xs: 64, sm: 82 } }}>
      <Typography variant="h3" sx={{ color: detail.color, fontSize: { xs: "1.75rem", sm: "2.1rem" } }}>{count}</Typography>
      <Typography variant="caption" color="text.secondary">{detail.label}</Typography>
      <Icon aria-label={detail.label} sx={{ color: detail.color, fontSize: 20 }} />
    </Stack>
  );
};

const PickResultRow = ({ item }) => {
  const detail = STATUS_DETAILS[item.status];
  const Icon = detail.icon;
  const teamName = item.selectedTeam.displayName || item.selectedTeam.abbr;
  return (
    <ButtonBase
      component={RouterLink}
      to={`/schedule/${item.id}`}
      aria-label={`View ${item.game.bowl || "game"}: ${teamName}, ${detail.label}`}
      sx={{
        width: "100%", minHeight: 72, px: 1.25, py: 1,
        justifyContent: "stretch", textAlign: "left", borderRadius: 1,
        "&:hover": { bgcolor: "rgba(255,255,255,0.035)" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
        <TeamLogo src={item.selectedTeam.logo} alt="" abbr={item.selectedTeam.abbr} size={34} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.15 }}>{teamName}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{item.game.bowl || "Bowl Game"}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3 }}>{formatResult(item)}</Typography>
        </Box>
        <Stack alignItems="flex-end" spacing={0.35} sx={{ flexShrink: 0 }}>
          <Chip icon={<Icon />} label={detail.label} size="small" sx={{ color: detail.color, "& .MuiChip-icon": { color: "inherit" } }} />
        </Stack>
      </Stack>
    </ButtonBase>
  );
};

const PickStatusSection = ({ section }) => {
  const detail = STATUS_DETAILS[section.status];
  const Icon = detail.icon;
  return (
    <Panel component="section" sx={{ p: 0, overflow: "hidden" }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Icon aria-hidden="true" sx={{ color: detail.color }} />
        <Typography component="h2" variant="h6">{detail.label}</Typography>
        <Typography sx={{ color: detail.color, fontWeight: 800 }}>({section.items.length})</Typography>
      </Stack>
      {section.items.length ? section.items.map((item, index) => (
        <Box key={item.id}>
          {index ? <Divider /> : null}
          <PickResultRow item={item} />
        </Box>
      )) : <Typography color="text.secondary" sx={{ px: 1.5, py: 2 }}>{detail.empty}</Typography>}
    </Panel>
  );
};

const LockedPicksView = ({ entry, games = [], selectionsByGameId = {} }) => {
  const [filter, setFilter] = useState("all");
  const items = useMemo(() => buildLockedPickItems({ games, selectionsByGameId }), [games, selectionsByGameId]);
  const counts = useMemo(() => getPickStatusCounts(items), [items]);
  const sections = useMemo(() => groupLockedPickItems(items, filter), [filter, items]);
  const filters = ["all", "correct", "incorrect", "live", "upcoming"];

  if (!entry) {
    return <Panel elevated><Stack spacing={1}><Typography variant="h4">My Picks</Typography><Typography color="text.secondary">Picks are locked and no pick set was created before the deadline.</Typography></Stack></Panel>;
  }

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ pb: { xs: 2, lg: 0 } }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography component="h1" variant="h3">My Picks</Typography>
          <Chip icon={<LockRoundedIcon />} label="Locked" color="warning" sx={{ fontWeight: 800 }} />
        </Stack>
      </Box>

      <Panel elevated sx={{ p: { xs: 2, md: 2.75 } }}>
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">{entry.entryName}</Typography>
            <PaymentStatusChip paymentStatus={entry.paymentStatus} />
          </Stack>
          <Stack direction="row" spacing={{ xs: 1.25, sm: 2.5, md: 4 }} flexWrap="wrap" divider={<Divider orientation="vertical" flexItem />}>
            <SummaryStat status="correct" count={counts.correct} />
            <SummaryStat status="incorrect" count={counts.incorrect} />
            <SummaryStat status="live" count={counts.live} />
            <SummaryStat status="upcoming" count={counts.upcoming} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.6, sm: 2.5 }} color="text.secondary">
            {entry.tieBreakerValue !== null && entry.tieBreakerValue !== undefined ? <Typography variant="body2">Tiebreaker <Box component="span" sx={{ mx: 0.6 }}>•</Box> <strong>{entry.tieBreakerValue} Total Points</strong></Typography> : null}
          </Stack>
        </Stack>
      </Panel>

      <Panel sx={{ p: { xs: 1.1, sm: 1.25 } }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap aria-label="Filter picks">
          {filters.map((name) => {
            const selected = filter === name;
            const count = name === "all" ? items.length : counts[name];
            return <ButtonBase key={name} aria-pressed={selected} onClick={() => setFilter(name)} sx={{ minHeight: 36, px: 1.1, borderRadius: 999, border: "1px solid", borderColor: selected ? "primary.main" : "divider", bgcolor: selected ? "rgba(255,203,5,0.12)" : "transparent", color: selected ? "primary.main" : "text.secondary", fontSize: "0.82rem", fontWeight: 800 }}>{name === "all" ? "All" : STATUS_DETAILS[name].label}{selected ? ` ${count}` : ""}</ButtonBase>;
          })}
        </Stack>
      </Panel>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fit, minmax(280px, 1fr))" }, gap: 1.5, alignItems: "start" }}>
        {sections.map((section) => <PickStatusSection key={section.status} section={section} />)}
      </Box>
    </Stack>
  );
};

export default LockedPicksView;
