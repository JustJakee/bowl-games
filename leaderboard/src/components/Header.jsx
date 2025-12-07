import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Tooltip,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import MenuIcon from "@mui/icons-material/Menu";
import GamesBanner from "./GamesBanner.jsx";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { fetchPicks } from "../utils/fetchPicks.js";

const Header = ({ currentPage, setCurrentPage, isLocked, gamesStarted}) => {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isBowlSeason = true; // this controls demo mode banner

  const handleTooltipOpen = () => setOpen(true);
  const handleTooltipClose = () => setOpen(false);

  const buildCsvShape = (submissions = []) => {
    if (!submissions.length) return { headers: [], rows: [] };

    const firstPicks = JSON.parse(submissions[0].picks || "{}");
    const bowlOrder = Object.keys(firstPicks);

    const headers = ["Name", ...bowlOrder, "Tie Breaker"];

    const rows = submissions.map((submission) => {
      const picksObj = JSON.parse(submission.picks || "{}");
      return [
        (submission.name || "").trim(),
        ...bowlOrder.map((bowl) => picksObj[bowl] ?? "-"),
        submission.tieBreaker,
      ];
    });

    return { headers, rows };
  };

  const downloadCsv = (data) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "picks_2025.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNavBarClick = async (navId) => {
    if (navId === "csv") {
      try {
        const picksResponse = await fetchPicks();
        const picks =
          picksResponse?.data?.listSubmissions?.items?.filter(Boolean) || [];

        const { headers, rows } = buildCsvShape(picks);

        const csvData =
          headers.join(",") +
          "\n" +
          rows.map((row) => row.join(",")).join("\n");
        if (csvData === "") {
          alert("No data to export");
        } else {
          downloadCsv(csvData);
        }
      } catch (err) {
        console.error("Error loading picks:", err);
      }
    } else {
      setCurrentPage(navId);
    }
  };

  const navItems = gamesStarted ? 
  [
    { id: "home", label: "Home" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "all-picks", label: "All Picks" },
    { id: "schedule-view", label: "Scores" },
    { id: "csv", label: "Download Picks" },
  ] :
  [
    { id: "home", label: "Home" },
    { id: "picks", label: "Enter Your Picks" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "schedule-view", label: "Scores" },
  ];

  return (
    <>
      {!isBowlSeason ? (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            bgcolor: "error.main",
            color: "#fff",
            zIndex: (t) => t.zIndex.appBar + 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            height: 28,
          }}
        >
          <Typography variant="caption" fontWeight={700}>
            Demo Mode
          </Typography>
          <Tooltip
            title={
              <Typography variant="body2" sx={{ color: "white" }}>
                The website is not up to date and will resume next season.
              </Typography>
            }
            open={open}
            onClose={handleTooltipClose}
            arrow
          >
            <IconButton
              size="small"
              sx={{ color: "inherit" }}
              onClick={handleTooltipOpen}
              aria-label="Demo mode information"
            >
              <InfoIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}

      {/* Games banner sits between demo bar and the app bar */}
      <GamesBanner />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: {
            xs: "var(--banner-h-no-demo)",
            sm: "calc(var(--banner-h) + var(--gamesbar-h))",
          },
          bgcolor: "var(--color-surface-2)",
          color: "var(--color-text)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: 48,
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography
          component="h1"
          variant="h6"
          fontWeight={800}
          noWrap
          onClick={() => handleNavBarClick("home")}
          sx={{
            mr: 1,
            cursor: "pointer",
            "&:hover": { color: "var(--accent-primary)" },
          }}
        >
          Bob's Bowl Game Pick 'em
        </Typography>

          {/* Desktop nav */}
          <Box
            role="navigation"
            aria-label="Primary Navigation"
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {navItems.map((item) => (
              <Button
                disabled={isLocked}
                key={item.id}
                size="small"
                onClick={() => handleNavBarClick(item.id)}
                aria-current={currentPage === item.id ? "page" : undefined}
                variant={currentPage === item.id ? "contained" : "text"}
                sx={{
                  textTransform: "uppercase",
                  fontWeight: 700,
                  ...(currentPage === item.id
                    ? {
                        bgcolor: "var(--accent-primary)",
                        color: "var(--accent-contrast)",
                        "&:hover": { bgcolor: "var(--accent-primary)" },
                      }
                    : { color: "var(--color-text)" }),
                }}
              >
                {item.label}
                {item.id === "csv" && <FileDownloadIcon fontSize="small" />}
              </Button>
            ))}
          </Box>

          {/* Mobile menu trigger */}
          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: "var(--color-text)",
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer navigation */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "var(--color-surface)",
            color: "var(--color-text)",
            width: 260,
            mt: "28px",
          },
        }}
      >
        <List role="menu" aria-label="Mobile Navigation">
          {navItems.map((item) => (
            <ListItemButton
              disabled={isLocked}
              key={item.id}
              role="menuitem"
              selected={currentPage === item.id}
              onClick={() => {
                if (item.id === "csv") {
                  handleNavBarClick(item.id);
                  setMobileOpen(false);
                } else {
                  setCurrentPage(item.id);
                  setMobileOpen(false);
                }
              }}
              sx={{ "&.Mui-selected": { bgcolor: "var(--color-hover)" } }}
            >
              {item.id === "csv" && (
                <FileDownloadIcon
                  fontSize="small"
                  style={{ marginRight: "8px" }}
                />
              )}
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default Header;
