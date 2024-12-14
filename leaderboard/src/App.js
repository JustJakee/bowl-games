import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';  // CSV parsing library
import csvFile from './assets/test.csv';
import Leaderboard from './components/leaderboard';
import FullView from './components/full-view';
import PickWinners from './components/pick-winners';
import Header from './components/header';

const App = () => {

  const [currentPage, setCurrentPage] = useState('leaderboard');
  const [playerPicks, setPlayerPicks] = useState([]);
  // A test set of Answers to test scoring
  const [winnerPicks, setWinnerPicks] = useState([]);

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
            picks[index].picks.push(gameRow[index + 2]?.trim() || '-');
          });
        }
        setPlayerPicks(picks);
      },
    });
    console.log('Updated Winner Picks:', winnerPicks);
  }, [winnerPicks]);

  const handlePickWinner = (gameId, team) => {
    setWinnerPicks((prevState) => {
      const updatedPicks = [...prevState];
      const existingPickIndex = updatedPicks.findIndex(pick => pick.gameId === gameId);

      if (existingPickIndex !== -1) {
        updatedPicks[existingPickIndex] = { gameId, team };
      } else {
        updatedPicks.push({ gameId, team });
      }

      return updatedPicks;
    });
  };

  const handleClearPick = (gameId) => {
    setWinnerPicks((prevState) => prevState.filter((pick) => pick.gameId !== gameId));
  };

  return (
    <div className="container mt-5">
      <title>College Bowl Game Picks 🏆</title>
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="content">
        {currentPage === 'leaderboard' && <Leaderboard playerPicks={playerPicks} winnerPicks={winnerPicks} />}
        {currentPage === 'full-view' && <FullView playerPicks={playerPicks} winnerPicks={winnerPicks} />}
        {currentPage === 'pick-winners' && <PickWinners
          winnerPicks={winnerPicks}
          onPickWinner={handlePickWinner}
          onClearPick={handleClearPick}
        />}
      </div>
    </div>
  );
};

export default App;
