import { Button, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";

const DashboardHero = ({ username, picksLocked }) => {
  return (
    <Panel
      elevated
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 88% 12%, rgba(255, 203, 5, 0.12), transparent 30%), linear-gradient(135deg, rgba(7, 28, 56, 0.98), rgba(2, 15, 31, 0.98))",
        "&::after": {
          content: '\"\"',
          position: "absolute",
          width: 190,
          height: 190,
          right: -92,
          bottom: -122,
          border: "1px solid",
          borderColor: "rgba(255, 203, 5, 0.16)",
          borderRadius: "50%",
          pointerEvents: "none",
        },
      }}
    >
      <Stack spacing={1.75} sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={1.25} sx={{ maxWidth: 760 }}>
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
          <Chip
            label={picksLocked ? "Picks Locked" : "Picks Open"}
            size="small"
            color={picksLocked ? "default" : "success"}
            sx={{ alignSelf: "flex-start", fontWeight: 800 }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              component={RouterLink}
              to="/picks"
              variant="contained"
              sx={{ minHeight: 42, px: 2.5 }}
            >
              Go to My Picks
            </Button>
            <Button
              component={RouterLink}
              to="/leaderboard"
              variant="outlined"
              sx={{ minHeight: 42, px: 2.5 }}
            >
              View Full Leaderboard
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Panel>
  );
};

export default DashboardHero;
