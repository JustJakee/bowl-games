import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

const Leaderboard = () => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    // Import the CSV file dynamically
    import('../master.csv')
      .then((module) => fetch(module.default))
      .then((response) => response.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            calculateScores(results.data);
          },
        });
      })
      .catch((error) => console.error('Error loading CSV:', error));
  }, []);

  const calculateScores = (data) => {
    const correctResults = ['WIN', 'WIN', 'LOSS', 'WIN']; // Example correct results
    const calculatedScores = data.map((player) => {
      const correctPicks = Object.values(player)
        .slice(1) // Skip the "Name" column
        .filter((pick, index) => pick === correctResults[index]).length;

      return {
        name: player.Name,
        correctPicks,
      };
    });

    calculatedScores.sort((a, b) => b.correctPicks - a.correctPicks);
    setScores(calculatedScores);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Correct Picks</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((player, index) => (
          <tr key={index}>
            <td>{player.name}</td>
            <td>{player.correctPicks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Leaderboard;
