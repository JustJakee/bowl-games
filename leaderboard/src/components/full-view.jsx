import React from 'react';
import '../assets/styles.css'

const FullView = ({ playerPicks, correctAnswers }) => {

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
            {playerPicks[0].picks.map((_, gameIndex) => (
              <tr key={gameIndex}>
                <td>Game {gameIndex + 1}</td>
                {playerPicks.map((player) => {
                  const pick = player.picks[gameIndex];
                  const correctAnswer = correctAnswers[gameIndex];

                  const isCorrect = correctAnswer && pick === correctAnswer;

                  return (
                    <td
                      key={player.name}
                      className={correctAnswer ? (isCorrect ? 'correct' : 'incorrect') : ''}
                    >
                      {pick}{' '}
                      {correctAnswer && isCorrect && (
                        <span className="text-success">✔️</span>
                      )}
                      {correctAnswer && !isCorrect && (
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
