import React from 'react';
import '../assets/styles.css';

const PickWinners = ({ matchups, onPickWinner}) => {
  const getButtonClass = (matchup, team) => {
    if (!matchup.winner) return '';
    return matchup.winner === team ? 'winner' : 'loser'; 
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
                    className={getButtonClass(matchup, matchup.team1)}
                    onClick={() => onPickWinner(matchup.id, matchup.team1)}
                  >
                    {matchup.team1}
                  </button>
                </td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup, matchup.team2)}
                    onClick={() => onPickWinner(matchup.id, matchup.team2)}
                  >
                    {matchup.team2}
                  </button>
                </td>
                <td align="center">
                  <button
                    onClick={() => onPickWinner(matchup.id, "")}
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
