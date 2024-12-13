import React, { useState, useEffect } from 'react';

const Leaderboard = () => {

const player = {
    name: "test",
    pick: "test",
}

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Correct Picks</th>
        </tr>
      </thead>
      <tbody>
        <td>1</td>
        <td>1</td>
      </tbody>
    </table>
  );
};

export default Leaderboard;
