import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';  // CSV parsing library
import csvFile from './assets/test.csv';
import Leaderboard from './components/leaderboard';
import FullView from './components/full-view';
import PickWinners from './components/pick-winners';
import Header from './components/header';

const App = () => {
  // var cfb = require('cfb.js');
  // var defaultClient = cfb.ApiClient.instance;
  // const apiKey = process.env.PRIVATE_API_KEY;
  // var ApiKeyAuth = defaultClient.authentications['ApiKeyAuth'];
  // ApiKeyAuth.apiKey = `Bearer ${apiKey}`
  // var api = new cfb.GamesApi();
  // https://www.npmjs.com/package/cfb.js#installation

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
  }, []);

  return (
    <div className="container mt-5">
      <title>College Bowl Game Picks 🏆</title>
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="content">
        {currentPage === 'leaderboard' && <Leaderboard playerPicks={playerPicks} winnerPicks={winnerPicks} />}
        {currentPage === 'full-view' && <FullView playerPicks={playerPicks} winnerPicks={winnerPicks} />}
        {currentPage === 'pick-winners' && <PickWinners winnerPicks={winnerPicks} />}
      </div>
    </div>
  );
};

export default App;
