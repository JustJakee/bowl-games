import React from 'react';
import '../assets/styles.css';
import matchups from '../constants/matchups';

const PickWinners = ({ winnerPicks, onPickWinner, onClearPick }) => {
  const getButtonClass = (gameId, team) => {
    const selectedPick = winnerPicks.find(pick => pick.gameId === gameId);
    if (!selectedPick) return '';
    return selectedPick.team === team ? 'winner' : 'loser';
  };

  return (
    <div>
      <div className="pick-winner-table-container">
      <pre>{JSON.stringify(winnerPicks, null, 2)}</pre>
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
                    onClick={() => onPickWinner(matchup.game, matchup.team1)}
                  >
                    {matchup.team1}
                  </button>
                </td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup.game, matchup.team2)}
                    onClick={() => onPickWinner(matchup.game, matchup.team2)}
                  >
                    {matchup.team2}
                  </button>
                </td>
                <td align="center">
                  <button
                    onClick={() => onClearPick(matchup.game)}
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
