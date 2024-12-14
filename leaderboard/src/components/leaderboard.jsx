import React from 'react';

const Leaderboard = ({ playerPicks, matchups }) => { 

  // Calculate the score for each player
  const playersWithScores = playerPicks.map(player => {
    const score = player.picks.reduce((total, pick, index) => {
      return pick === matchups[index] ? total + 1 : total;
    }, 0);
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
