import React from 'react';
import '../assets/styles.css'
import teamNamesDict from '../constants/teamNames'

const FullView = ({ playerPicks, matchups }) => {

  return (
    <div>
      <div className="full-view-table-container">
        <table className="full-view-table">
          <thead>
            <tr>
              {/* I want to add Match Ups Here this is a place holder.*/}
              <th style={{ padding: '15px', minWidth: '120px' }}>Game</th>
              {playerPicks.map((player, index) => (
                <th key={index} style={{ padding: '15px', minWidth: '120px' }}>
                  {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playerPicks[0].picks.slice(0, 40).map((_, gameIndex) => (
              <tr key={gameIndex}>
                <td>{matchups[gameIndex].game}</td>
                {playerPicks.map((player) => {
                  const pick = player.picks[gameIndex];

                  let isCorrect = false;
                  let noWinner = false;

                  if (teamNamesDict[matchups[gameIndex].winner] === pick) {
                    isCorrect = true;
                  } else if (matchups[gameIndex].winner === undefined || matchups[gameIndex].winner === "") {
                    noWinner = true;
                  }

                  return (
                    <td
                      key={player.name}
                      className={
                        noWinner
                          ? 'no-winner'
                          : isCorrect && !noWinner
                          ? 'correct'
                          : 'incorrect'
                      }
                    >
                      {pick}{' '}
                      {(isCorrect && !noWinner) && (
                        <span className="text-success">✔️</span>
                      )}
                      {(!isCorrect && !noWinner) && (
                        <span className="text-danger">❌</span>
                      )}
                      {(noWinner) && (
                        <span className='no-winner'></span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FullView;
