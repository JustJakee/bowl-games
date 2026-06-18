import { Box, Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import DashboardHero from "../components/dashboard/DashboardHero";
import PickStatusCard from "../components/dashboard/PickStatusCard";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
import DashboardQuickLinks from "../components/dashboard/DashboardQuickLinks";
import SeasonStatusPanel from "../components/dashboard/SeasonStatusPanel";
import {
  dashboardEntries,
  dashboardLeaderboard,
  dashboardPickStatus,
  dashboardQuickLinks,
  SEASON_LOCK_DEADLINE,
} from "../data/dashboardMockData";

const DashboardPage = () => {
  const { profile } = useUserProfile();
  const theme = useTheme();
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  if (isLargeDesktop) {
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
            <Box sx={{ display: "flex", minWidth: 0 }}>
              <PickStatusCard data={dashboardPickStatus} />
            </Box>
            <Box sx={{ display: "flex", minWidth: 0 }}>
              <LeaderboardCard
                rows={dashboardLeaderboard}
                currentUsername={profile?.username}
              />
            </Box>
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
