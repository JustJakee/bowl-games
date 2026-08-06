// UI — LAYOUT — REACT
// Desktop and mobile navigation share this authenticated shell and scoreboard entry point.
import { useState } from "react";
import {
  Box,
  Avatar,
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
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import ScoreboardStrip from "../components/scoreboard/ScoreboardStrip";
import DesktopSidebar, { DESKTOP_SIDEBAR_WIDTH } from "./DesktopSidebar";
import MobileHeader from "./MobileHeader";
import MobileBottomNavigation from "./MobileBottomNavigation";

const drawerLinks = [
  { to: "/rules", label: "Rules", icon: <MenuBookRoundedIcon /> },
  { to: "/more", label: "Account" },
];

const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { signOut, email } = useAuth();
  const { profile } = useUserProfile();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const username = profile?.username || "Player";
  const hideScoreboard = pathname === "/schedule" || pathname.startsWith("/schedule/");

  return (
    <Box
      sx={{
        // Keep the app backdrop independent of the rendered route height. The
        // fixed transitions prevent short filtered Picks states from pulling
        // the dark portion of the gradient upward.
        minHeight: { xs: "calc(100vh + 92px)", lg: "100vh" },
        overflowX: "hidden",
        background:
          "linear-gradient(180deg, #12325b 0px, #07111f 520px, #050c16 760px)",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#050c16",
      }}
    >
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
          {hideScoreboard ? null : <ScoreboardStrip />}

          <Box sx={{ pt: { xs: 2, lg: 2 }, mt: hideScoreboard ? 0 : 2 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      {!isDesktop ? (
        <MobileBottomNavigation
          menuOpen={menuOpen}
          onOpenMore={() => setMenuOpen(true)}
        />
      ) : null}

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            backgroundColor: "background.paper",
            display: "flex",
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2.5, height: "100%" }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 900,
              }}
            >
              {username.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">{username}</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: "break-word" }}
              >
                {email || "Authenticated user"}
              </Typography>
            </Box>
          </Stack>
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
                {link.icon ? (
                  <Box sx={{ display: "inline-flex", mr: 1.5, color: "primary.main" }}>
                    {link.icon}
                  </Box>
                ) : null}
                <ListItemText primary={link.label} />
                <ChevronRightRoundedIcon fontSize="small" />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ flexGrow: 1 }} />
          <Divider />
          <List disablePadding>
            <ListItemButton
              onClick={signOut}
              sx={{ borderRadius: 2, color: "text.secondary" }}
            >
              <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
              <ListItemText primary="Sign Out" />
            </ListItemButton>
          </List>
        </Stack>
      </Drawer>
    </Box>
  );
};

export default AppShell;
