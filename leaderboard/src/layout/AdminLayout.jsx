import { Box, ButtonBase, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink, NavLink, Navigate, Outlet } from "react-router-dom";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { useAuth } from "../auth/AuthContext";
import { useScoreboard } from "../context/NCAAFDataContext";
import { isAdminGameManagementEnabled } from "../utils/adminGameManagement";
import Panel from "../components/common/Panel";
const AdminLayout = () => {
  const { role, signOut, email } = useAuth(); const { season, seasonConfig, loading } = useScoreboard();
  const isAdmin = role === "admin";
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading || !season) return <Box sx={{ p: 3 }}>Loading admin workspace...</Box>;
  const testSeason = isAdminGameManagementEnabled(season);
  const items = [{ to: "/admin/entries", label: "Entries", icon: <ListAltRoundedIcon /> }, ...(testSeason ? [{ to: "/admin/games", label: "Games (Test Season)", icon: <SportsFootballRoundedIcon /> }] : [])];
  return <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0,1fr)" }, bgcolor: "background.default" }}>
    <Stack component="aside" spacing={2} sx={{ p: 2, borderRight: { md: "1px solid" }, borderColor: "divider" }}>
      <Box><Typography variant="overline" color="primary.main">BOB&apos;S</Typography><Typography variant="h5">BOWL GAMES</Typography><Typography variant="overline" color="text.secondary">Admin</Typography></Box><Divider />
      <Stack component="nav">{items.map((item) => <ButtonBase key={item.to} component={NavLink} to={item.to} sx={{ justifyContent: "flex-start", gap: 1.25, px: 1.25, py: 1.2, borderLeft: "3px solid transparent", "&.active": { color: "primary.main", borderLeftColor: "primary.main", bgcolor: "rgba(255,203,5,.08)" } }}>{item.icon}<Typography>{item.label}</Typography></ButtonBase>)}</Stack>
      <Panel sx={{ p: 1.25 }}><Typography variant="overline" color="text.secondary">Season</Typography><Typography sx={{ fontWeight: 800 }}>{season.name}</Typography>{testSeason ? <Typography variant="caption" color="primary.main">Test Season</Typography> : null}<Typography variant="body2" color="text.secondary">{season.status}</Typography><Typography variant="caption" color="text.secondary">{seasonConfig?.picksLockAt || "Lock date unavailable"}</Typography></Panel>
      <Box sx={{ flexGrow: 1 }} /><Typography variant="caption" color="text.secondary">{email}</Typography><ButtonBase component={NavLink} to="/admin/account" sx={{ justifyContent: "flex-start", gap: 1, py: 1, "&.active": { color: "primary.main" } }}><PersonOutlineRoundedIcon fontSize="small" /><Typography>Account</Typography></ButtonBase><ButtonBase onClick={signOut} sx={{ justifyContent: "flex-start", gap: 1, py: 1 }}><LogoutRoundedIcon fontSize="small" /><Typography>Sign Out</Typography></ButtonBase>
    </Stack>
    <Box sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}><Outlet /></Box>
  </Box>;
}; export default AdminLayout;
