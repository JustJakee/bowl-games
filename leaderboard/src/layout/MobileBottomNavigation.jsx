import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { matchPath, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { value: "/dashboard", label: "Dashboard", icon: <DashboardRoundedIcon /> },
  { value: "/leaderboard", label: "Leaderboard", icon: <EmojiEventsRoundedIcon /> },
  { value: "/picks", label: "Picks", icon: <SportsFootballRoundedIcon /> },
  { value: "/entries", label: "Entries", icon: <ViewListRoundedIcon /> },
  { value: "/more", label: "More", icon: <MoreHorizRoundedIcon /> },
];

const MobileBottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentValue =
    navItems.find((item) => matchPath({ path: item.value }, location.pathname))?.value ||
    "/dashboard";

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        showLabels
        value={currentValue}
        onChange={(_event, nextValue) => navigate(nextValue)}
        sx={{
          backgroundColor: "background.paper",
          height: 64,
          "& .Mui-selected": {
            color: "primary.main",
          },
          "& .MuiBottomNavigationAction-root": {
            borderTop: "3px solid transparent",
          },
          "& .Mui-selected.MuiBottomNavigationAction-root": {
            borderTopColor: "primary.main",
          },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction key={item.value} value={item.value} label={item.label} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNavigation;
