import { useState } from "react";
import {
  AppBar,
  Box,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useAuth } from "../auth/AuthContext";
import { useScoreboard } from "../context/NCAAFDataContext";
import { isAdminGameManagementEnabled } from "../utils/adminGameManagement";
import { usePickWindowLocked } from "../hooks/usePickWindowLocked";
import { getEffectiveSeasonStatus } from "../utils/pickWindow";
import Panel from "../components/common/Panel";
import BuilderCredit from "../components/common/BuilderCredit";

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { role, signOut, email } = useAuth();
  const { season, seasonConfig, loading } = useScoreboard();
  const picksLocked = usePickWindowLocked(
    seasonConfig?.picksLockAt,
    season?.status,
  );
  const effectiveSeasonStatus = picksLocked
    ? getEffectiveSeasonStatus({
        seasonStatus: season?.status,
        picksLockAt: seasonConfig?.picksLockAt,
      })
    : season?.status;
  const isAdmin = role === "admin";

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return <Box sx={{ p: 3 }}>Loading admin workspace...</Box>;
  }

  const testSeason = isAdminGameManagementEnabled(season);
  const items = [
    {
      to: "/admin/registrations",
      label: "Approvals",
      icon: <HowToRegRoundedIcon />,
    },
    { to: "/admin/entries", label: "Entries", icon: <ListAltRoundedIcon /> },
    { to: "/admin/payouts", label: "Payouts", icon: <EmojiEventsRoundedIcon /> },
    ...(testSeason
      ? [
          {
            to: "/admin/games",
            label: "Games (Test Season)",
            icon: <SportsFootballRoundedIcon />,
          },
        ]
      : []),
  ];

  const seasonDetails = (
    <Panel sx={{ p: 1.25 }}>
      <Typography variant="overline" color="text.secondary">
        Season
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>
        {season?.name || "No selected season"}
      </Typography>
      {testSeason ? (
        <Typography variant="caption" color="primary.main">
          Test Season
        </Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary">
        {effectiveSeasonStatus}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {seasonConfig?.picksLockAt || "Lock date unavailable"}
      </Typography>
    </Panel>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "240px minmax(0,1fr)" },
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { xs: "flex", md: "none" },
          top: 0,
          left: 0,
          right: 0,
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar disableGutters sx={{ minHeight: 76, px: 2, py: 1.25 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontSize: "1.0625rem", fontWeight: 900, lineHeight: 1.2 }}
            >
              BOB&apos;S BOWL GAMES
            </Typography>
            <Typography
              color="primary.main"
              sx={{
                mt: 0.25,
                fontSize: "0.8125rem",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Admin
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            aria-label="Open admin menu"
            onClick={() => setMenuOpen(true)}
            sx={{ width: 44, height: 44, ml: 1, flexShrink: 0 }}
          >
            <MenuRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box aria-hidden="true" sx={{ display: { xs: "block", md: "none" }, height: 76 }} />

      <Stack
        component="aside"
        spacing={2}
        sx={{
          display: { xs: "none", md: "flex" },
          p: 2,
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              component="img"
              src="/branding/icon-192.png"
              alt=""
              sx={{ width: 28, height: 28, flexShrink: 0 }}
            />
            <Typography variant="overline" color="primary.main">
              BOB&apos;S
            </Typography>
          </Stack>
          <Typography variant="h5">BOWL GAMES</Typography>
          <Typography variant="overline" color="text.secondary">
            Admin
          </Typography>
        </Box>
        <Divider />
        <Stack component="nav">
          {items.map((item) => (
            <ButtonBase
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                justifyContent: "flex-start",
                gap: 1.25,
                px: 1.25,
                py: 1.2,
                borderLeft: "3px solid transparent",
                "&.active": {
                  color: "primary.main",
                  borderLeftColor: "primary.main",
                  bgcolor: "rgba(255,203,5,.08)",
                },
              }}
            >
              {item.icon}
              <Typography>{item.label}</Typography>
            </ButtonBase>
          ))}
        </Stack>
        {seasonDetails}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {email}
        </Typography>
        <ButtonBase
          component={NavLink}
          to="/admin/account"
          sx={{
            justifyContent: "flex-start",
            gap: 1,
            py: 1,
            "&.active": { color: "primary.main" },
          }}
        >
          <PersonOutlineRoundedIcon fontSize="small" />
          <Typography>Account</Typography>
        </ButtonBase>
        <ButtonBase
          onClick={signOut}
          sx={{ justifyContent: "flex-start", gap: 1, py: 1 }}
        >
          <LogoutRoundedIcon fontSize="small" />
          <Typography>Sign Out</Typography>
        </ButtonBase>
        <BuilderCredit />
      </Stack>

      <Box
        sx={{
          px: { xs: 1.5, sm: 2, md: 3 },
          pt: { xs: 2.5, sm: 3, md: 3 },
          pb: { xs: 3, md: 3 },
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        PaperProps={{ sx: { width: 286, bgcolor: "background.paper" } }}
      >
        <Stack spacing={1.5} sx={{ p: 2, height: "100%" }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Admin Menu
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                sx={{ borderRadius: 2 }}
              >
                <Box
                  sx={{
                    display: "inline-flex",
                    mr: 1.5,
                    color: "primary.main",
                  }}
                >
                  {item.icon}
                </Box>
                <ListItemText primary={item.label} />
                <ChevronRightRoundedIcon fontSize="small" />
              </ListItemButton>
            ))}
            <ListItemButton
              component={NavLink}
              to="/admin/account"
              onClick={() => setMenuOpen(false)}
              sx={{ borderRadius: 2 }}
            >
              <PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
              <ListItemText primary="Account" />
              <ChevronRightRoundedIcon fontSize="small" />
            </ListItemButton>
          </List>
          {seasonDetails}
          <Box sx={{ flexGrow: 1 }} />
          <Divider />
          <List disablePadding>
            <ListItemButton onClick={signOut} sx={{ borderRadius: 2 }}>
              <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
              <ListItemText primary="Sign Out" />
            </ListItemButton>
          </List>
          <BuilderCredit />
        </Stack>
      </Drawer>
    </Box>
  );
};

export default AdminLayout;
