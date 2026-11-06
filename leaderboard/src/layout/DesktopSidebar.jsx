// UI — NAVIGATION — REACT
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import { Box, ButtonBase, Chip, Divider, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import BuilderCredit from "../components/common/BuilderCredit";
import { useAppData } from "../app/AppDataContext.jsx";
import { shouldShowAccountPaymentNotification } from "../utils/dashboardVisibility.js";

export const DESKTOP_SIDEBAR_WIDTH = {
  lg: "220px",
  xl: "240px",
};

const primaryNavItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <DashboardRoundedIcon fontSize="small" />,
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: <EmojiEventsRoundedIcon fontSize="small" />,
  },
  {
    to: "/picks",
    label: "Picks",
    icon: <SportsFootballRoundedIcon fontSize="small" />,
  },
  {
    to: "/schedule",
    label: "Games",
    icon: <CalendarMonthRoundedIcon fontSize="small" />,
  },
  {
    to: "/rules",
    label: "Rules",
    icon: <MenuBookRoundedIcon fontSize="small" />,
  },
  {
    to: "/install",
    label: "Install App",
    icon: <DownloadRoundedIcon fontSize="small" />,
  },
];

const secondaryNavItems = [
  {
    to: "/more",
    label: "Account",
    icon: <PersonOutlineRoundedIcon fontSize="small" />,
  },
];

const navButtonSx = {
  position: "relative",
  width: "100%",
  justifyContent: "flex-start",
  gap: 1.5,
  px: 2.5,
  py: 1.5,
  borderLeft: "3px solid transparent",
  color: "text.secondary",
  textDecoration: "none",
  borderRadius: 0,
  transition:
    "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
  "&.active": {
    color: "primary.main",
    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
    borderLeftColor: "primary.main",
  },
  "&.active .desktop-sidebar-icon": {
    color: "primary.main",
  },
  "&:hover": {
    backgroundColor: (theme) => alpha(theme.palette.common.white, 0.04),
    color: "text.primary",
  },
  "&:focus-visible": {
    outline: (theme) => `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
};

export const SidebarNavButton = ({ icon, label, to, notification }) => {
  return (
    <ButtonBase component={NavLink} to={to} sx={navButtonSx}>
      <Box
        className="desktop-sidebar-icon"
        sx={{
          color: "text.secondary",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 120ms ease",
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="button"
        sx={{ fontSize: "0.8rem", letterSpacing: "0.05em", textAlign: "left" }}
      >
        {label}
      </Typography>
      {notification ? (
        <Chip
          size="small"
          label="1"
          aria-label="1 account notification"
          sx={{
            ml: "auto",
            height: 20,
            minWidth: 20,
            bgcolor: "error.main",
            color: "error.contrastText",
            fontWeight: 800,
            "& .MuiChip-label": { px: 0.5 },
          }}
        />
      ) : null}
    </ButtonBase>
  );
};

const DesktopSidebar = ({ signOut }) => {
  const { currentEntry, entriesLoading, entriesReady } = useAppData();
  const paymentDue = shouldShowAccountPaymentNotification({
    currentEntry,
    entriesLoading,
    entriesReady,
  });
  return (
    <Box
      component="aside"
      sx={{
        display: { xs: "none", lg: "flex" },
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: DESKTOP_SIDEBAR_WIDTH,
        flexDirection: "column",
        backgroundColor: "background.default",
        borderRight: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        zIndex: (theme) => theme.zIndex.appBar - 1,
      }}
    >
      <Stack sx={{ px: 2.5, pt: 3, pb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            component="img"
            src="/branding/icon-192.png"
            alt=""
            sx={{ width: 28, height: 28, flexShrink: 0 }}
          />
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ letterSpacing: "0.18em", lineHeight: 1.1 }}
          >
            BOB&apos;S
          </Typography>
        </Stack>
        <Typography
          variant="h5"
          sx={{ lineHeight: 0.98, textTransform: "uppercase" }}
        >
          Bowl Games
        </Typography>
      </Stack>

      <Divider />

      <Stack component="nav" aria-label="Primary" sx={{ pt: 1.5 }}>
        {primaryNavItems.map((item) => (
          <SidebarNavButton key={item.to} {...item} />
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Divider />

      <Stack component="nav" aria-label="Account" sx={{ py: 1.5 }}>
        {secondaryNavItems.map((item) => (
          <SidebarNavButton key={item.to} {...item} notification={paymentDue} />
        ))}
        <ButtonBase onClick={signOut} sx={navButtonSx}>
          <Box
            className="desktop-sidebar-icon"
            sx={{
              color: "text.secondary",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoutRoundedIcon fontSize="small" />
          </Box>
          <Typography
            variant="button"
            sx={{
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
              textAlign: "left",
            }}
          >
            Log Out
          </Typography>
        </ButtonBase>
      </Stack>
      <BuilderCredit />
    </Box>
  );
};

export default DesktopSidebar;
