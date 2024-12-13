import React, { useState } from 'react';
import '../assets/styles.css';
import matchups from '../constants/matchups';

const PickWinners = ({ winnerPicks }) => {
  const [selectedWinners, setSelectedWinners] = useState({});

  const handlePickWinner = (gameId, team) => {
    setSelectedWinners((prevState) => ({
      ...prevState,
      [gameId]: team,
    }));
  };

  const handleClearPick = (gameId) => {
    setSelectedWinners((prevState) => {
      const newState = { ...prevState };
      delete newState[gameId];
      return newState;
    });
  };

  const getButtonClass = (gameId, team) => {
    if (!selectedWinners[gameId]) return '';
    return selectedWinners[gameId] === team ? 'winner' : 'loser';
  };

  return (
    <div>
      <div className="pick-winner-table-container">
        <table className="pick-winner-table">
          <thead>
            <tr>
              <th>Bowl</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((matchup) => (
              <tr key={matchup.game}>
                <td align="center">{matchup.game}</td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup.game, matchup.team1)}
                    onClick={() => handlePickWinner(matchup.game, matchup.team1)}
                  >
                    {matchup.team1}
                  </button>
                </td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup.game, matchup.team2)}
                    onClick={() => handlePickWinner(matchup.game, matchup.team2)}
                  >
                    {matchup.team2}
                  </button>
                </td>
                <td align="center">
                  <button
                    onClick={() => handleClearPick(matchup.game)}
                    className="clear-button"
                  >
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PickWinners;
