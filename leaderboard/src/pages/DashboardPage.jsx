// UI - DASHBOARD - REACT
import { useMemo } from "react";
import { Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppData } from "../app/AppDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import DashboardHero from "../components/dashboard/DashboardHero";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
import DashboardQuickLinks from "../components/dashboard/DashboardQuickLinks";
import SeasonStatusPanel from "../components/dashboard/SeasonStatusPanel";
import { buildDashboardEntries } from "../utils/dashboardEntryProgress";
import { dashboardQuickLinks } from "../data/dashboardMockData";

const DashboardPage = () => {
  const { profile } = useUserProfile();
  const {
    currentEntry,
    matchups,
    picksLockAt,
    picksLocked,
    tieBreakerRequired,
    savedSelectionsByGameId,
  } = useAppData();
  const { rows: leaderboardRows } = useSeasonLeaderboard();
  const theme = useTheme();
  const isWideDesktop = useMediaQuery(theme.breakpoints.up("xl"));
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
  const dashboardLeaderboard = leaderboardRows.slice(0, 5).map((row) => ({
    rank: row.rank,
    username: row.username,
    entryName: row.entryName,
    points: row.points,
    record: row.record,
  }));

  if (isWideDesktop) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            minWidth: 0,
            alignContent: "start",
          }}
        >
          <DashboardHero
            username={profile?.username || "Player"}
            deadline={picksLockAt}
          />

          <LeaderboardCard
            rows={dashboardLeaderboard}
            currentUsername={profile?.username}
          />

          <UpcomingBowlsCard />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignContent: "start",
            minWidth: 0,
          }}
        >
          <SeasonStatusPanel
            deadline={picksLockAt}
            links={dashboardQuickLinks}
          />
          <EntriesCard entry={dashboardEntries[0] || null} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2.5}>
        <DashboardHero
          username={profile?.username || "Player"}
          deadline={picksLockAt}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          <EntriesCard entry={dashboardEntries[0] || null} />
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <LeaderboardCard
              rows={dashboardLeaderboard}
              currentUsername={profile?.username}
            />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <UpcomingBowlsCard />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <DashboardQuickLinks links={dashboardQuickLinks} />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default DashboardPage;
