import React from 'react';
import teamNamesDict from '../constants/teamNames';

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

  const setRowStyle = (index) => {
    let style = "";
    if (index === 0) {
      style = "first";
    } else if (index === 1) {
      style = "second";
    } else if (index === 2) {
      style = "third";
    } else if (index === 3) {
      style = "fourth";
    }

    return style;
  }

  const setPlacePayments = (index) => {
    let place = index;
    if (index === 0) {
      place = "🥇 1 ($90)";
    } else if (index === 1) {
      place = "🥈 2 ($30)";
    } else if (index === 2) {
      place = "🥉 3 ($20)";
    } else if (index === 3) {
      place = "💸 4 ($10)";
    } else {
      place = index + 1;
    }

    return place;
  }

  // Sort players by score (descending order)
  playersWithScores.sort((a, b) => b.score - a.score);

  return (
    <div className="leaderboard-container">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Correct Picks</th>
          </tr>
        </thead>
        <tbody>
          {playersWithScores.map((player, index) => (
            <tr key={index} className={setRowStyle(index)}>
              <td>{setPlacePayments(index)}</td>
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
