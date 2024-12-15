import React from 'react';
import teamNamesDict from '../constants/teamNames'

const Leaderboard = ({ playerPicks, matchups }) => { 

  // Calculate the score for each player
  const playersWithScores = playerPicks.map(player => {
    let score = 0;
    for (let i = 0; i < player.picks.length; i++) {
      for (let j = 0; j < matchups.length; j++) {
        if (player.picks[i] === teamNamesDict[matchups[j].winner]) {
          score++;
        }
      }
    }

    return {
      ...player,
      score
    };
  });

  // Sort players by score (descending order)
  playersWithScores.sort((a, b) => b.score - a.score);

  return (
    <div>
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            <th scope="col">Correct Picks</th>
          </tr>
        </thead>
        <tbody>
          {playersWithScores.map((player, index) => (
            <tr key={index} className={index === 0 ? "table-success" : ""}>
              <td>{index + 1}</td>
              <td>{player.name}</td>
              <td>{player.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
