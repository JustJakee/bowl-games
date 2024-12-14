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
            {playerPicks[0].picks.slice(0, 39).map((_, gameIndex) => (
              <tr key={gameIndex}>
                <td>{matchups[gameIndex].game}</td>
                {playerPicks.map((player) => {
                  const pick = player.picks[gameIndex];

                  let winnersArray = [];
                  for (let i = 0; i < matchups.length; i++) {
                    winnersArray.push([parseInt(matchups[i].date), teamNamesDict[matchups[i].winner]]);
                    winnersArray.sort()
                  }

                  let isCorrect = false;
                  let noWinner = false;
                  if (winnersArray[gameIndex][1] === undefined || winnersArray[gameIndex][1] === "") {
                    noWinner = true;
                  } else if (winnersArray[gameIndex][1] === pick) {
                    isCorrect = true;
                  } else {
                    isCorrect = false;
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
