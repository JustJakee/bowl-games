import { useState } from "react";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Link as RouterLink, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import ScoreboardStrip from "../components/scoreboard/ScoreboardStrip";
import DesktopSidebar, { DESKTOP_SIDEBAR_WIDTH } from "./DesktopSidebar";
import MobileHeader from "./MobileHeader";
import MobileBottomNavigation from "./MobileBottomNavigation";

const drawerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/picks", label: "Picks" },
  { to: "/entries", label: "Entries" },
  { to: "/schedule", label: "Schedule" },
  { to: "/rules", label: "Rules" },
];

const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, role, email } = useAuth();
  const { profile } = useUserProfile();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const username = profile?.username || "Player";

  return (
    <Box sx={{ minHeight: "100vh", overflowX: "hidden" }}>
      {isDesktop ? <DesktopSidebar signOut={signOut} /> : null}

      <Box
        sx={{
          minHeight: "100vh",
          ml: isDesktop ? DESKTOP_SIDEBAR_WIDTH : 0,
          width: isDesktop
            ? {
                lg: "calc(100% - 220px)",
                xl: "calc(100% - 240px)",
              }
            : "100%",
        }}
      >
        {!isDesktop ? (
          <Box
            sx={{
              width: "100%",
              maxWidth: "1600px",
              marginInline: "auto",
              px: { xs: 2, sm: 3, md: 3 },
            }}
          >
            <MobileHeader onOpenMenu={() => setMenuOpen(true)} />
          </Box>
        ) : null}

        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "1600px", lg: "none" },
            marginInline: "auto",
            px: { xs: 2, sm: 3, md: 3, lg: 1.5, xl: 2 },
            pb: { xs: "calc(92px + env(safe-area-inset-bottom))", lg: 5 },
          }}
        >
          <ScoreboardStrip />

          <Box sx={{ pt: { xs: 2, lg: 2 }, mt: 2 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      {!isDesktop ? <MobileBottomNavigation /> : null}

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            backgroundColor: "background.paper",
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <div>
            <Typography variant="overline" color="text.secondary">
              Signed In
            </Typography>
            <Typography variant="h6">{username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {email || "Authenticated user"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Role: {role || "unassigned"}
            </Typography>
          </div>
          <Divider />
          <List disablePadding>
            {drawerLinks.map((link) => (
              <ListItemButton
                key={link.to}
                component={NavLink}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                sx={{ borderRadius: 2 }}
              >
                <ListItemText primary={link.label} />
                <ChevronRightRoundedIcon fontSize="small" />
              </ListItemButton>
            ))}
            <ListItemButton
              component={RouterLink}
              to="/more"
              onClick={() => setMenuOpen(false)}
              sx={{ borderRadius: 2 }}
            >
              <ListItemText primary="Account" />
              <ChevronRightRoundedIcon fontSize="small" />
            </ListItemButton>
            <ListItemButton onClick={signOut} sx={{ borderRadius: 2 }}>
              <ListItemText primary="Sign Out" />
              <LogoutRoundedIcon fontSize="small" />
            </ListItemButton>
          </List>
        </Stack>
      </Drawer>
    </Box>
  );
};

export default AppShell;
