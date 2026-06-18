import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import PicksLockSummary from "./PicksLockSummary";

const DashboardHero = ({ username, deadline }) => {
  return (
    <Panel elevated sx={{ overflow: "hidden" }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={3}
          justifyContent="space-between"
        >
          <Stack spacing={1.25} sx={{ maxWidth: 620 }}>
            <Typography variant="overline" color="primary.main">
              Welcome Back, {username}
            </Typography>
            <Typography variant="h3" sx={{ textTransform: "uppercase", lineHeight: 1 }}>
              2026 Bowl Season
            </Typography>
            <Box
              sx={{
                alignSelf: "flex-start",
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                backgroundColor: "rgba(76, 175, 114, 0.16)",
              }}
            >
              <Typography variant="overline" sx={{ color: "success.main" }}>
                Picks Open
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Track the bowl slate, finish your entries, and keep an eye on the pool before kickoff.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button component={RouterLink} to="/picks" variant="contained">
                Make Your Picks
              </Button>
              <Button component={RouterLink} to="/leaderboard" variant="outlined">
                View Leaderboard
              </Button>
            </Stack>
          </Stack>
          <Box sx={{ display: { xs: "block", lg: "none" } }}>
            <PicksLockSummary deadline={deadline} compact />
          </Box>
        </Stack>
      </Stack>
    </Panel>
  );
};

export default DashboardHero;
