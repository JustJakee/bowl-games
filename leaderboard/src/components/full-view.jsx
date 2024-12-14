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
            {playerPicks[0].picks.slice(0,39).map((_, gameIndex) => (
              <tr key={gameIndex}>
                <td>Game {gameIndex + 1}</td>
                {playerPicks.map((player) => {
                  const pick = player.picks[gameIndex];

                  let winnersArray = [];
                  for (let i = 0; i < matchups.length; i++) {
                    winnersArray.push([matchups[i].team1, matchups[i].team2 ,teamNamesDict[matchups[i].winner]]);
                  }
                  console.log(winnersArray)

                  // find key from value. value is "pick" in this case

                  let isCorrect = false;
                  if (winnersArray.includes(pick)) {
                    isCorrect = true;
                  } else {
                    isCorrect = false;
                  }

                  return (
                    <td
                      key={player.name}
                      className={isCorrect ? 'correct' : 'incorrect'}
                    >
                      {pick}{' '}
                      {isCorrect && (
                        <span className="text-success">✔️</span>
                      )}
                      {!isCorrect && (
                        <span className="text-danger">❌</span>
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
