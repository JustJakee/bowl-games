import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import PicksLockSummary from "./PicksLockSummary";

const DashboardHero = ({ username, deadline }) => {
  return (
    <Panel elevated sx={{ overflow: "hidden" }}>
      <Stack spacing={{ xs: 2.25, lg: 2 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 2.25, lg: 2 }}
          justifyContent="space-between"
        >
          <Stack spacing={1.25} sx={{ maxWidth: { lg: 760 } }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontSize: { md: "0.85rem" }, fontWeight: 700 }}
            >
              Welcome Back, {username}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                textTransform: "uppercase",
                lineHeight: 1.05,
                fontSize: { md: "2rem", lg: "2.5rem", xl: "2.75rem" },
                fontWeight: 800,
              }}
            >
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
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { md: "0.95rem", lg: "1rem" }, lineHeight: 1.5, maxWidth: 620 }}
            >
              Track the bowl slate, finish your entries, and keep an eye on the pool before kickoff.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button component={RouterLink} to="/picks" variant="contained" sx={{ minHeight: 42, px: 2.5 }}>
                Make Your Picks
              </Button>
              <Button
                component={RouterLink}
                to="/leaderboard"
                variant="outlined"
                sx={{ minHeight: 42, px: 2.5 }}
              >
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
