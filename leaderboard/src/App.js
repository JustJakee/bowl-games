import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/global.css";
import { useState, useEffect } from "react";
import Papa from "papaparse"; // CSV parsing library
import csvFile from "./assets/test.csv";
import ScheduleView from "./components/ScheduleView.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import FullView from "./components/FullView.jsx";
import Footer from "./components/Footer.jsx";
import PickWinners from "./components/PickWinners.jsx";
import Header from "./components/Header.jsx";
import { ScoreboardProvider } from "./context/NCAAFDataContext";
import { insertMatchups } from "./utils/insertMatchups"; // this script added everything to DB
import { fetchMatchups } from "./utils/fetchMatchups"; // this script pulls everything from DB
import { deleteMatchups } from "./utils/deleteMatchups"; // this script deletes everything from DB
import { updateMatchups } from "./utils/updateMatchups"; // this script updates a matchup winner
import { Amplify } from "aws-amplify";
import config from "./aws-exports.js";

Amplify.configure(config);

const App = () => {
  const [currentPage, setCurrentPage] = useState("leaderboard");
  const [playerPicks, setPlayerPicks] = useState([]);
  const [matchups, setMatchups] = useState([]);

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

    const fetchAndSetMatchups = async () => {
      const fetchedMatchups = await fetchMatchups();
      setMatchups(fetchedMatchups);
    };
    fetchAndSetMatchups();
  }, []);

  const handlePickWinner = async (gameId, team) => {
    await updateMatchups(gameId, team);
  };

  /* Only run insertData(); once to add matchups to DB */
  const insertData = async () => {
    await insertMatchups();
  };

  /* Only run clearData(); if the DB needs to be purged */
  const clearData = async () => {
    await deleteMatchups(); // Delete all matchups first
  };

  return (
    <ScoreboardProvider>
      <div className="container">
      <title>College Bowl Game Picks 🏆</title>

        <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="content">
          {/*This button is only used to add or delete the data*/}
          {/*<button onClick={insertData}>Insert Data</button>*/}
          {currentPage === "schedule-view" && (
            <ScheduleView playerPicks={playerPicks} matchups={matchups} />
          )}
          {currentPage === "leaderboard" && (
            <Leaderboard playerPicks={playerPicks} matchups={matchups} />
          )}
          {currentPage === "full-view" && (
            <FullView playerPicks={playerPicks} matchups={matchups} />
          )}
          {currentPage === "pick-winners" && (
            <PickWinners matchups={matchups} onPickWinner={handlePickWinner} />
          )}
        </div>
        <Footer />
      </div>
    </ScoreboardProvider>
  );
};

export default App;
