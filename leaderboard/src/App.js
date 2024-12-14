import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';  // CSV parsing library
import csvFile from './assets/test.csv';
import Leaderboard from './components/leaderboard';
import FullView from './components/full-view';
import PickWinners from './components/pick-winners';
import Header from './components/header';
import { insertMatchups } from './utils/insertMatchups' // this script added everything to DB
import { fetchMatchups } from './utils/fetchMatchups' // this script pulls everything from DB
import { deleteMatchups } from './utils/deleteMatchups' // this script deletes everything from DB
import { Amplify } from 'aws-amplify';
import config from './aws-exports';

Amplify.configure(config);

const App = () => {
  const [currentPage, setCurrentPage] = useState('leaderboard');
  const [playerPicks, setPlayerPicks] = useState([]);
  // A test set of Answers to test scoring
  const [winnerPicks, setWinnerPicks] = useState([]);

  // Load winnerPicks from localStorage when the app first renders
  useEffect(() => {
    const storedWinnerPicks = localStorage.getItem('winnerPicks');
    if (storedWinnerPicks) {
      setWinnerPicks(JSON.parse(storedWinnerPicks)); // Parse and set state
    }

    /* Only run fetchAndLogMatchups(); if you need to see a full list of data in the console. */
    const fetchAndLogMatchups = async () => {
      const matchups = await fetchMatchups();
      console.log('Current Matchups:', matchups);
    };
    fetchAndLogMatchups();

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
  }, []);

  // Save winnerPicks to localStorage whenever it changes
  // Once we use API data this will no longer be needed
  useEffect(() => {
    if (winnerPicks.length > 0) {
      localStorage.setItem('winnerPicks', JSON.stringify(winnerPicks));
    }
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

  /* Only run insertData(); once to add matchups to DB */
  const insertData = async () => {
    await insertMatchups();
  };

  /* Only run clearData(); if the DB needs to be purged */
  const clearData = async () => {
    await deleteMatchups();  // Delete all matchups first
  };

  return (
    <div className="container mt-5">
      <title>College Bowl Game Picks 🏆</title>

      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="content">
        {/*This button is only used to add or delete the data*/}
        {/*<button onClick={insertData}>Insert Data</button>*/}
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
