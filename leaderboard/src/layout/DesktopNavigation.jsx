import { Stack, ButtonBase, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/picks", label: "Make Picks" },
  { to: "/entries", label: "My Entries" },
  { to: "/schedule", label: "Schedule" },
  { to: "/rules", label: "Rules" },
];

const DesktopNavigation = () => {
  return (
    <Stack
      direction="row"
      spacing={{ md: 1, lg: 1.5 }}
      sx={{ borderTop: "1px solid", borderColor: "divider", pb: 1.25 }}
    >
      {navItems.map((item) => (
        <ButtonBase
          key={item.to}
          component={NavLink}
          to={item.to}
          sx={{
            px: { md: 2, lg: 2.5 },
            py: 1.5,
            borderBottom: "3px solid transparent",
            color: "text.secondary",
            textDecoration: "none",
            "&.active": {
              color: "primary.main",
              borderBottomColor: "primary.main",
            },
          }}
        >
          <Typography
            variant="button"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 700,
              letterSpacing: "0.025em",
            }}
          >
            {item.label}
          </Typography>
        </ButtonBase>
      ))}
    </Stack>
  );
};

export default DesktopNavigation;
