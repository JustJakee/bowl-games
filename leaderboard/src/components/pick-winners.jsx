import React from 'react';
import '../assets/styles.css'
import matchups from '../constants/matchups';

const PickWinners = ({ winnerPicks }) => {
  return (
    <div>
      <div className="full-view-table-container">
        <table className="full-view-table">
          <thead>
            <tr>
              <th>Bowl</th>
              <th>Team 1</th>
              <th>Team 2</th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((matchup) => (
              <tr>
                <td align="center">{matchup.game}</td>
                <td align="center"><button>{matchup.team1}</button></td>
                <td align="center"><button>{matchup.team2}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PickWinners;
