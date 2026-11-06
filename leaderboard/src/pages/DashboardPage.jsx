// UI - DASHBOARD - REACT
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppData } from "../app/AppDataContext.jsx";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import DashboardHero from "../components/dashboard/DashboardHero";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
import SeasonStatusPanel from "../components/dashboard/SeasonStatusPanel";
import PaymentDueBanner from "../components/dashboard/PaymentDueBanner";
import { buildDashboardEntries } from "../utils/dashboardEntryProgress";
import {
  canShowDashboardLeaderboard,
  getDashboardPaymentState,
  getFirstKickoffTime,
} from "../utils/dashboardVisibility.js";
import { dashboardQuickLinks } from "../data/dashboardMockData";
import { shouldShowSeasonPending } from "../utils/seasonExperience";
import SeasonPendingPage from "./SeasonPendingPage.jsx";
import PageLoading from "../components/common/PageLoading.jsx";
import { isDashboardPageLoading } from "../utils/pageReadiness.js";
import { displayLeaderboardUsername } from "../features/leaderboard/leaderboardViewModel";

const ActiveDashboardPage = ({ showLeaderboard }) => {
  const { profile } = useUserProfile();
  const {
    currentEntry,
    currentSeasonId,
    matchups,
    picksLockAt,
    picksLocked,
    tieBreakerRequired,
    savedSelectionsByGameId,
  } = useAppData();
  const {
    rows: leaderboardRows,
    error: leaderboardError,
    errorIsConnectivity: leaderboardErrorIsConnectivity,
    ready: leaderboardReady,
    seasonId: leaderboardSeasonId,
    reload: reloadLeaderboard,
  } = useSeasonLeaderboard();
  const { connectionStatus } = useScoreboard();
  const theme = useTheme();
  const isDesktopDashboard = useMediaQuery(theme.breakpoints.up("lg"));
  const paymentState = getDashboardPaymentState(currentEntry);
  const totalPicks = matchups.length;
  const requiredGameIds = useMemo(
    () => matchups.map((matchup) => matchup.id).filter(Boolean),
    [matchups],
  );
  const dashboardEntries = buildDashboardEntries({
    entries: currentEntry ? [currentEntry] : [],
    progressByEntryId: currentEntry
      ? {
          [currentEntry.id]: {
            requiredGameIds,
            selectionsByGameId: savedSelectionsByGameId,
          },
        }
      : {},
    totalPicks,
    picksLocked,
    tieBreakerRequired,
  });
  const leaderboardIsCurrent =
    leaderboardReady && leaderboardSeasonId === String(currentSeasonId || "");
  const dashboardLeaderboard = (leaderboardIsCurrent ? leaderboardRows : [])
    .slice(0, isDesktopDashboard ? 8 : 5)
    .map((row) => ({
      rank: row.rank,
      username: displayLeaderboardUsername(row.username),
      points: row.points,
      record: row.record,
    }));
  const mobileAreas = [
    '"hero"',
    ...(!picksLocked ? ['"pickSet"'] : []),
    '"seasonStatus"',
    '"upcoming"',
    ...(showLeaderboard ? ['"leaderboard"'] : []),
  ].join(" ");
  const desktopAreas = [
    ...(picksLocked
      ? ['"hero seasonStatus"']
      : ['"hero pickSet"', '"seasonStatus pickSet"']),
    '"upcoming upcoming"',
    ...(showLeaderboard ? ['"leaderboard leaderboard"'] : []),
  ].join(" ");

  return (
    <>
      <PaymentDueBanner paymentState={paymentState} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 2fr) minmax(280px, 1fr)",
          },
          gridTemplateAreas: { xs: mobileAreas, lg: desktopAreas },
          mt: paymentState === "unpaid" ? { xs: 2.5, lg: 2 } : 0,
          gap: { xs: 2.5, lg: 2 },
          alignItems: { xs: "start", lg: "stretch" },
        }}
      >
        <Box sx={{ gridArea: "hero", minWidth: 0 }}>
          <DashboardHero
            username={profile?.username || "Player"}
            picksLocked={picksLocked}
            showLeaderboard={showLeaderboard}
          />
        </Box>
        {!picksLocked ? (
          <Box sx={{ gridArea: "pickSet", minWidth: 0 }}>
            <EntriesCard
              entry={dashboardEntries[0] || null}
              deadline={picksLockAt}
            />
          </Box>
        ) : null}
        <Box sx={{ gridArea: "seasonStatus", minWidth: 0 }}>
          <SeasonStatusPanel
            deadline={picksLockAt}
            links={dashboardQuickLinks}
            picksLocked={picksLocked}
            paymentState={paymentState}
          />
        </Box>
        <Box sx={{ gridArea: "upcoming", minWidth: 0 }}>
          <UpcomingBowlsCard />
        </Box>
        {showLeaderboard ? (
          <Box sx={{ gridArea: "leaderboard", minWidth: 0 }}>
            <LeaderboardCard
              rows={dashboardLeaderboard}
              currentUsername={profile?.username}
              error={leaderboardErrorIsConnectivity && connectionStatus !== "ready" ? "" : leaderboardError}
              unavailable={leaderboardErrorIsConnectivity && connectionStatus !== "ready"}
              loading={!leaderboardIsCurrent && !leaderboardError}
              onRetry={reloadLeaderboard}
            />
          </Box>
        ) : null}
      </Box>
    </>
  );
};

const DashboardPage = () => {
  const {
    error: scoreboardError,
    errorIsConnectivity: scoreboardErrorIsConnectivity,
    connectionStatus,
    loading: scoreboardLoading,
    reload: reloadScoreboard,
    season,
    seasonConfig,
    rawGames,
  } = useScoreboard();
  const {
    currentEntry,
    entriesError,
    entriesErrorIsConnectivity,
    entriesRefreshError,
    entriesLoading,
    entriesReady,
    hydratedEntryId,
    picksError,
    picksErrorIsConnectivity,
    picksRefreshError,
    picksLoading,
  } = useAppData();
  const firstKickoffTime = getFirstKickoffTime(rawGames);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let timer;
    const refreshAtBoundary = () => {
      const current = Date.now();
      setNow(current);
      const nextBoundary = [
        seasonConfig?.picksOpenAt,
        seasonConfig?.picksLockAt,
        firstKickoffTime,
      ]
        .map((value) =>
          typeof value === "number" ? value : Date.parse(value || ""),
        )
        .filter((value) => Number.isFinite(value) && value > current)
        .sort((left, right) => left - right)[0];
      if (nextBoundary)
        timer = window.setTimeout(
          refreshAtBoundary,
          Math.min(nextBoundary - current + 1, 2_147_483_647),
        );
    };
    refreshAtBoundary();
    return () => window.clearTimeout(timer);
  }, [seasonConfig?.picksOpenAt, seasonConfig?.picksLockAt, firstKickoffTime]);
  const showSeasonPending = shouldShowSeasonPending({
    season,
    seasonConfig,
    games: rawGames,
    now,
  });
  const loading = isDashboardPageLoading({
    currentEntryId: currentEntry?.id,
    entriesError,
    entriesLoading,
    entriesReady,
    hydratedEntryId,
    picksError,
    picksLoading,
    scoreboardError,
    scoreboardLoading,
    seasonId: season?.id,
    usesEntryData: !showSeasonPending,
  });

  if (loading) {
    return <PageLoading loading message="Loading your dashboard..." />;
  }

  if (scoreboardError && !season) {
    return (
      <Alert
        severity="error"
        action={<Button color="inherit" size="small" onClick={reloadScoreboard}>Retry</Button>}
      >
        {scoreboardErrorIsConnectivity ? "Season data is unavailable while disconnected." : `Season data is unavailable. ${scoreboardError}`}
      </Alert>
    );
  }

  const scopedDataError = entriesError || (currentEntry ? picksError : "");
  if (scopedDataError) {
    const connectivityFailure = entriesError ? entriesErrorIsConnectivity : picksErrorIsConnectivity;
    return <Alert severity={connectivityFailure ? "warning" : "error"}>{connectivityFailure ? "Your account data is unavailable while disconnected." : scopedDataError}</Alert>;
  }

  const refreshError =
    (!scoreboardErrorIsConnectivity && scoreboardError) ||
    entriesRefreshError || picksRefreshError;
  return (
    <>
      {refreshError && connectionStatus === "ready" ? (
        <Alert severity="warning" sx={{ mb: 2 }}>Some dashboard information could not be refreshed. Displayed information may be outdated.</Alert>
      ) : null}
      {showSeasonPending ? (
        <SeasonPendingPage season={season} seasonConfig={seasonConfig} />
      ) : (
        <ActiveDashboardPage showLeaderboard={canShowDashboardLeaderboard(firstKickoffTime, now)} />
      )}
    </>
  );
};

export default DashboardPage;
