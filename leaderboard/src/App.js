import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/global.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert, Snackbar } from "@mui/material";
import ScheduleView from "./components/ScheduleView.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import { useScoreboard } from "./context/NCAAFDataContext";
import { Amplify } from "aws-amplify";
import config from "./amplifyconfiguration.json";
import PickForm from "./components/PickForm.jsx";
import Home from "./components/Home.jsx";
import { fetchPicks } from "./utils/fetchPicks";
// import mockResults from "./assets/mockBowlsResults.json";
import AllPicks from "./components/AllPicks.jsx";

Amplify.configure(config);

const App = () => {
  const [currentPage, setCurrentPage] = useState("home");
  const [playerPicks, setPlayerPicks] = useState([]);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [picksLoading, setPicksLoading] = useState(false);
  const [isLocked, setLocked] = useState(true);
  const { games: scoreboardGames } = useScoreboard();

  const handleToastClose = (event, reason) => {
    if (reason === "clickaway") return; // keep it open unless explicit close or timeout
    setToast((prev) => ({ ...prev, open: false }));
  };

  /*
  // Build mock matchups with computed winners (mirrors ESPN shape but final)
  useEffect(() => {
    const seen = {};
    const gamesWithWinners = (mockResults || []).map((game, index) => {
      const bowlName = game?.bowl || "Bowl Game";
      const count = (seen[bowlName] || 0) + 1;
      seen[bowlName] = count;
      const pickKey = count > 1 ? `${bowlName} (#${count})` : bowlName;

      const homeScore = Number(game?.home?.score ?? 0);
      const awayScore = Number(game?.away?.score ?? 0);
      let winnerAbbr = "";
      if (!Number.isNaN(homeScore) && !Number.isNaN(awayScore)) {
        if (homeScore > awayScore) winnerAbbr = game?.home?.abbr || "";
        else if (awayScore > homeScore) winnerAbbr = game?.away?.abbr || "";
      }

      return {
        id: game?.id || `mock-${index}`,
        game: bowlName,
        pickKey,
        team1: game?.home?.displayName || game?.home?.abbr || "Home",
        team2: game?.away?.displayName || game?.away?.abbr || "Away",
        winner: winnerAbbr,
        date: game?.startTimeText || `${index}`,
      };
    });
    setMatchups(gamesWithWinners);
  }, []);
  */

  // Build matchups from live scoreboard data (keeps pick keys aligned with PickForm)
  const matchups = useMemo(() => {
    const seen = {};
    return (scoreboardGames || []).map((game, index) => {
      const bowlName = game?.bowl || "Bowl Game";
      const count = (seen[bowlName] || 0) + 1;
      seen[bowlName] = count;
      const pickKey = count > 1 ? `${bowlName} (#${count})` : bowlName;

      const homeScore = Number(game?.home?.score);
      const awayScore = Number(game?.away?.score);
      const scoresValid = !Number.isNaN(homeScore) && !Number.isNaN(awayScore);
      let winnerAbbr = "";
      if (scoresValid && (game?.isFinal || game?.state === "post")) {
        if (homeScore > awayScore) winnerAbbr = game?.home?.abbr || "";
        else if (awayScore > homeScore) winnerAbbr = game?.away?.abbr || "";
      }

      return {
        id: game?.id || `game-${index}`,
        game: bowlName,
        pickKey,
        team1: game?.home?.displayName || game?.home?.abbr || "Home",
        team2: game?.away?.displayName || game?.away?.abbr || "Away",
        winner: winnerAbbr,
        date: game?.startTimeText || `${index}`,
        gameTotal: homeScore + awayScore,
      };
    });
  }, [scoreboardGames]);

  // Load picks from the GraphQL API to keep everything in sync
  const loadPicks = useCallback(async () => {
    if (matchups.length === 0) return;
    setPicksLoading(true);
    try {
      const picksResponse = await fetchPicks();
      const submissions =
        picksResponse?.data?.listSubmissions?.items?.filter(Boolean) || [];

      const normalizedPicks = submissions.map((submission) => {
        let parsedPicks = {};
        try {
          parsedPicks = JSON.parse(submission?.picks || "{}");
        } catch (err) {
          parsedPicks = {};
        }

        const picksArray = matchups.map((game) => {
          const bowlKey = game?.pickKey || game?.game?.trim() || "No Bowl Game";
          return parsedPicks?.[bowlKey] || "-";
        });

        return {
          name: submission?.name?.trim() || "Unnamed Entry",
          picks: picksArray,
          tiebreaker: submission?.tieBreaker,
        };
      });
      setPlayerPicks(normalizedPicks);
    } catch (err) {
      console.error("Failed to load picks:", err);
      setToast({
        open: true,
        severity: "error",
        message: "Unable to load picks from the database.",
      });
    } finally {
      setPicksLoading(false);
    }
  }, [matchups]);

  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  return (
    <div className="container">
      <title>College Bowl Game Picks 🏆</title>

      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLocked={isLocked}
      />
      <div className="content">
        {currentPage === "home" && (
          <Home
            onNavigate={setCurrentPage}
            setLocked={setLocked}
            isLocked={isLocked}
          />
        )}
        {currentPage === "schedule-view" && (
          <ScheduleView playerPicks={playerPicks} matchups={matchups} />
        )}
        {currentPage === "all-picks" && (
          <AllPicks playerPicks={playerPicks} matchups={matchups} />
        )}
        {currentPage === "leaderboard" && (
          <Leaderboard
            playerPicks={playerPicks}
            matchups={matchups}
            loading={picksLoading}
          />
        )}
        {currentPage === "picks" && (
          <PickForm
            playerPicks={playerPicks}
            matchups={matchups}
            onSubmitResult={(result) => {
              if (!result) return;
              setToast({ open: true, ...result });
              if (result.severity === "success") {
                loadPicks();
                setCurrentPage("leaderboard");
              }
            }}
          />
        )}
      </div>
      <Footer />
      <Snackbar
        open={toast.open}
        autoHideDuration={20000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 2 }}
        onClose={handleToastClose}
      >
        <Alert
          elevation={6}
          variant="filled"
          severity={toast.severity}
          onClose={handleToastClose}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default App;
