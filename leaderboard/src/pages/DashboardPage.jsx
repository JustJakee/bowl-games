import Grid from "@mui/material/Grid2";
import { Stack, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import DashboardHero from "../components/dashboard/DashboardHero";
import PicksLockSummary from "../components/dashboard/PicksLockSummary";
import PickStatusCard from "../components/dashboard/PickStatusCard";
import EntriesCard from "../components/dashboard/EntriesCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import UpcomingBowlsCard from "../components/dashboard/UpcomingBowlsCard";
import DashboardQuickLinks from "../components/dashboard/DashboardQuickLinks";
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

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 8.5 }}>
        <Stack spacing={2.5}>
          <DashboardHero username={profile?.username || "Player"} deadline={SEASON_LOCK_DEADLINE} />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <PickStatusCard data={dashboardPickStatus} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <EntriesCard entries={dashboardEntries} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <LeaderboardCard rows={dashboardLeaderboard} currentUsername={profile?.username} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <UpcomingBowlsCard />
            </Grid>
            <Grid size={{ xs: 12, lg: 0 }} sx={{ display: { xs: "block", lg: "none" } }}>
              <DashboardQuickLinks links={dashboardQuickLinks} />
            </Grid>
          </Grid>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, lg: 3.5 }}>
        <Stack spacing={2.5}>
          {isLargeDesktop ? <PicksLockSummary deadline={SEASON_LOCK_DEADLINE} /> : null}
          <Stack sx={{ display: { xs: "none", lg: "flex" } }}>
            <DashboardQuickLinks links={dashboardQuickLinks} />
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default DashboardPage;
