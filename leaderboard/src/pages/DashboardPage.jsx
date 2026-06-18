import { Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppData } from "../app/AppDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import DashboardHero from "../components/dashboard/DashboardHero";
import PickStatusCard from "../components/dashboard/PickStatusCard";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
import DashboardQuickLinks from "../components/dashboard/DashboardQuickLinks";
import SeasonStatusPanel from "../components/dashboard/SeasonStatusPanel";
import {
  dashboardQuickLinks,
  SEASON_LOCK_DEADLINE,
} from "../data/dashboardMockData";

const DashboardPage = () => {
  const { profile } = useUserProfile();
  const {
    currentEntry,
    currentEntryStatus,
    matchups,
    playerPicks,
    savedSelectionsByGameId,
  } = useAppData();
  const theme = useTheme();
  const isWideDesktop = useMediaQuery("(min-width:1360px)");
  const totalPicks = matchups.length;
  const completedPicks = Object.values(savedSelectionsByGameId || {}).filter(Boolean).length;
  const finishedGames = matchups.filter((game) => Boolean(game.winner));
  const dashboardPickStatus = currentEntry
    ? {
        entryName: currentEntry.entryName,
        status: currentEntryStatus === "COMPLETE" ? "Complete" : "In Progress",
        completedPicks,
        totalPicks,
        tiebreaker:
          currentEntry.tieBreakerValue === null || currentEntry.tieBreakerValue === undefined
            ? "Not Set"
            : String(currentEntry.tieBreakerValue),
      }
    : null;
  const dashboardEntries = currentEntry
    ? [
        {
          id: currentEntry.id,
          name: currentEntry.entryName,
          completedPicks,
          totalPicks,
          status: currentEntryStatus === "COMPLETE" ? "Complete" : "In Progress",
        },
      ]
    : [];
  const dashboardLeaderboard = playerPicks.map((entry, index) => {
    const correctPicks = entry.picks.reduce((score, pick, pickIndex) => {
      const winner = matchups[pickIndex]?.winner;
      return winner && winner === pick ? score + 1 : score;
    }, 0);

    return {
      rank: index + 1,
      username: profile?.username || "Player",
      entryName: entry.name,
      points: correctPicks,
      record: `${correctPicks}-${Math.max(finishedGames.length - correctPicks, 0)}`,
    };
  });

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
          <DashboardHero username={profile?.username || "Player"} deadline={SEASON_LOCK_DEADLINE} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 0.75fr) minmax(0, 1.75fr)",
              gap: 2,
              alignItems: "stretch",
              minWidth: 0,
            }}
          >
            <PickStatusCard data={dashboardPickStatus} />
            <LeaderboardCard
              rows={dashboardLeaderboard}
              currentUsername={profile?.username}
            />
          </Box>

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
          <SeasonStatusPanel deadline={SEASON_LOCK_DEADLINE} links={dashboardQuickLinks} />
          <EntriesCard entries={dashboardEntries} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2.5}>
        <DashboardHero username={profile?.username || "Player"} deadline={SEASON_LOCK_DEADLINE} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          <PickStatusCard data={dashboardPickStatus} />
          <EntriesCard entries={dashboardEntries} />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <LeaderboardCard rows={dashboardLeaderboard} currentUsername={profile?.username} />
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
