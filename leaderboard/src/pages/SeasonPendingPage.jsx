import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import Panel from "../components/common/Panel";
import WinnersPodium from "../components/WinnersPodium";
import { loadPreviousSeasonResults } from "../data/previousSeasonResults";

export default function SeasonPendingPage({ season, seasonConfig }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loadPreviousSeasonResults(season)
      .then((result) => { if (active) setHistory(result); })
      .catch((loadError) => { if (active) setError(loadError?.message || "Previous results could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [season?.id, season?.year]);

  const opensAt = Date.parse(seasonConfig?.picksOpenAt || "");
  const openingText = Number.isFinite(opensAt)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(opensAt)
    : null;

  return <Stack spacing={2.5}>
    <Panel elevated sx={{ p: { xs: 3, md: 4 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <EventNoteRoundedIcon color="primary" />
        <Typography variant="overline" color="primary.main">{season?.name || "Selected season"}</Typography>
      </Stack>
      <Typography variant="h3" sx={{ mt: 1, fontWeight: 900, textTransform: "uppercase" }}>Season pending</Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 720 }}>
        Picks are not open for this season yet. Your account approval is separate from the season schedule.
      </Typography>
      {openingText ? <Box sx={{ mt: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Typography variant="overline" color="text.secondary">Configured picks opening</Typography>
        <Typography fontWeight={800}>{openingText}</Typography>
      </Box> : null}
      {season?.isTestSeason ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Test season selected. This page will clear when its pick window opens.</Typography> : null}
    </Panel>
    {error ? <Alert severity="warning">{error}</Alert> : null}
    {loading ? <CircularProgress size={24} aria-label="Loading previous season results" /> : null}
    {!loading ? <WinnersPodium season={history?.season} winners={history?.winners || []} tiebreakerTotal={history?.tiebreakerTotal} /> : null}
  </Stack>;
}
