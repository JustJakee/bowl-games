import { useState } from "react";
import {
  Box,
  Container,
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
import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";
import DesktopNavigation from "./DesktopNavigation";
import MobileBottomNavigation from "./MobileBottomNavigation";

const drawerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/picks", label: "Make Picks" },
  { to: "/entries", label: "My Entries" },
  { to: "/schedule", label: "Schedule" },
  { to: "/rules", label: "Rules" },
  { to: "/more", label: "More" },
];

const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, role, email } = useAuth();
  const { profile } = useUserProfile();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const username = profile?.username || "Player";

  return (
    <Box sx={{ minHeight: "100vh", overflowX: "hidden" }}>
      <ScoreboardStrip />
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        {isDesktop ? (
          <>
            <DesktopHeader username={username} signOut={signOut} />
            <DesktopNavigation />
          </>
        ) : (
          <MobileHeader onOpenMenu={() => setMenuOpen(true)} />
        )}
      </Container>

      <Container
        maxWidth="xl"
        sx={{
          px: { xs: 2, md: 3 },
          pb: { xs: "calc(92px + env(safe-area-inset-bottom))", md: 5 },
          pt: 2,
        }}
      >
        <Outlet />
      </Container>

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
              <ListItemText primary="Account & More" />
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
