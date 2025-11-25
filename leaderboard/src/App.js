import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/global.css";
import { useState, useEffect } from "react";
import { Alert, Snackbar } from "@mui/material";
import Papa from "papaparse"; // CSV parsing library
import csvFile from "./assets/test.csv";
import ScheduleView from "./components/ScheduleView.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import { ScoreboardProvider } from "./context/NCAAFDataContext";
import { Amplify } from "aws-amplify";
import config from "./amplifyconfiguration.json";
import PickForm from "./components/PickForm.jsx";

Amplify.configure(config);

const App = () => {
  const [currentPage, setCurrentPage] = useState("leaderboard");
  const [playerPicks, setPlayerPicks] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleToastClose = (event, reason) => {
    if (reason === "clickaway") return; // keep it open unless explicit close or timeout
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Load winnerPicks from localStorage when the app first renders
  useEffect(() => {
    Papa.parse(csvFile, {
      download: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data;
        const playerNames = rawData[0].slice(2);
        // Skip the first two columns (Date, and placeholders)

        const picks = playerNames.map((name) => ({
          name: name.trim(),
          picks: [],
        }));

        for (let i = 1; i < rawData.length; i += 2) {
          const gameRow = rawData[i];
          if (!gameRow) continue;

          playerNames.forEach((_, index) => {
            picks[index].picks.push(gameRow[index + 2]?.trim() || "-");
          });
        }
        setPlayerPicks(picks);
      },
    });
  }, []);

  return (
    <ScoreboardProvider>
      <div className="container">
        <title>College Bowl Game Picks 🏆</title>

        <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="content">
          {currentPage === "schedule-view" && (
            <ScheduleView playerPicks={playerPicks} matchups={matchups} />
          )}
          {currentPage === "leaderboard" && (
            <Leaderboard playerPicks={playerPicks} matchups={matchups} />
          )}
          {currentPage === "picks" && (
            <PickForm
              playerPicks={playerPicks}
              matchups={matchups}
              onSubmitResult={(result) => {
                if (!result) return;
                setToast({ open: true, ...result });
                if (result.severity === "success") {
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
    </ScoreboardProvider>
  );
};

export default App;
