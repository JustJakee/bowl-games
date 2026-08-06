// UI - DASHBOARD - REACT
import { useMemo } from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppData } from "../app/AppDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import DashboardHero from "../components/dashboard/DashboardHero";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
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
  const isDesktopDashboard = useMediaQuery(theme.breakpoints.up("lg"));
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
  const dashboardLeaderboard = leaderboardRows
    .slice(0, isDesktopDashboard ? 8 : 5)
    .map((row) => ({
      rank: row.rank,
      username: row.username,
      entryName: row.entryName,
      points: row.points,
      record: row.record,
    }));

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "minmax(0, 2fr) minmax(280px, 1fr)",
        },
        gridTemplateAreas: {
          xs: picksLocked
            ? `"hero" "seasonStatus" "leaderboard" "upcoming"`
            : `"hero" "pickSet" "seasonStatus" "leaderboard" "upcoming"`,
          lg: picksLocked
            ? `"hero seasonStatus" "leaderboard leaderboard" "upcoming upcoming"`
            : `"hero pickSet" "leaderboard seasonStatus" "upcoming upcoming"`,
        },
        gap: { xs: 2.5, lg: 2 },
        alignItems: { xs: "start", lg: "stretch" },
      }}
    >
      <Box sx={{ gridArea: "hero", minWidth: 0 }}>
        <DashboardHero
          username={profile?.username || "Player"}
          picksLocked={picksLocked}
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
          paymentStatus={currentEntry?.paymentStatus}
          hasEntry={Boolean(currentEntry)}
        />
      </Box>
      <Box sx={{ gridArea: "leaderboard", minWidth: 0 }}>
        <LeaderboardCard
          rows={dashboardLeaderboard}
          currentUsername={profile?.username}
        />
      </Box>
      <Box sx={{ gridArea: "upcoming", minWidth: 0 }}>
        <UpcomingBowlsCard />
      </Box>
    </Box>
  );
};

export default DashboardPage;
