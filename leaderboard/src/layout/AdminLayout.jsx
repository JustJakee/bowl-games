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
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useAuth } from "../auth/AuthContext";
import { useScoreboard } from "../context/NCAAFDataContext";
import { isAdminGameManagementEnabled } from "../utils/adminGameManagement";
import Panel from "../components/common/Panel";

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { role, signOut, email } = useAuth();
  const { season, seasonConfig, loading } = useScoreboard();
  const isAdmin = role === "admin";

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading || !season) {
    return <Box sx={{ p: 3 }}>Loading admin workspace...</Box>;
  }

  const testSeason = isAdminGameManagementEnabled(season);
  const items = [
    { to: "/admin/entries", label: "Entries", icon: <ListAltRoundedIcon /> },
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
      <Typography sx={{ fontWeight: 800 }}>{season.name}</Typography>
      {testSeason ? (
        <Typography variant="caption" color="primary.main">
          Test Season
        </Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary">
        {season.status}
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
        position="sticky"
        elevation={0}
        sx={{
          display: { xs: "flex", md: "none" },
          gridColumn: "1 / -1",
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar
          disableGutters
          sx={{ minHeight: 76, px: 2, py: 1.25 }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontSize: "1.0625rem", fontWeight: 900, lineHeight: 1.2 }}
            >
              BOB&apos;S BOWL GAMES
            </Typography>
            <Typography
              color="primary.main"
              sx={{ mt: 0.25, fontSize: "0.8125rem", fontWeight: 700, lineHeight: 1.2 }}
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
          <Typography variant="overline" color="primary.main">
            BOB&apos;S
          </Typography>
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
          sx={{ justifyContent: "flex-start", gap: 1, py: 1, "&.active": { color: "primary.main" } }}
        >
          <PersonOutlineRoundedIcon fontSize="small" />
          <Typography>Account</Typography>
        </ButtonBase>
        <ButtonBase onClick={signOut} sx={{ justifyContent: "flex-start", gap: 1, py: 1 }}>
          <LogoutRoundedIcon fontSize="small" />
          <Typography>Sign Out</Typography>
        </ButtonBase>
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
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {email}
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
                <Box sx={{ display: "inline-flex", mr: 1.5, color: "primary.main" }}>
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
        </Stack>
      </Drawer>
    </Box>
  );
};

export default AdminLayout;
