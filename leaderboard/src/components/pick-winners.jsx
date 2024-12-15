import React, { useState, useEffect } from 'react';
import '../assets/styles.css';

const PickWinners = ({ matchups, onPickWinner }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
  const [error, setError] = useState(false);

  const correctPassword = "7427"; // Temp Pin

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Adjust for mobile breakpoint
    };

    handleResize(); // Check initial window size
    window.addEventListener('resize', handleResize); // Update on window resize

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getButtonClass = (matchup, team) => {
    if (!matchup.winner) return '';
    return matchup.winner === team ? 'winner' : 'loser';
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setError(false);
      setIsPasswordCorrect(true);
    } else {
      setError(true);
    }
  };

  if (!isPasswordCorrect) {
    return (
      <div className="password-protection">
        <form onSubmit={handlePasswordSubmit}>
          <label htmlFor="password">Enter Pin Number:</label>
          <input
            type="tel"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PIN"
            className={error ? 'error-input' : ''}
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength="4"
          />
          {error && <div className="error-message">Incorrect Pin. Please try again.</div>}
          <button type="submit">Submit</button>
          {error &&
            <button
              className="return-button"
              onClick={() => window.location.href = '/leaderboard'}
              type="button">
              Return to Leaderboard
            </button>
          }
        </form>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div>
        <div className="pick-winner-mobile-container">
          {matchups.map((matchup) => (
            <div key={matchup.game} className="pick-winner-mobile-game">
              <div className="pick-winner-mobile-game-header">{matchup.game}</div>
              <div className="pick-winner-mobile-teams">
                <button
                  className={getButtonClass(matchup, matchup.team1)}
                  onClick={() => onPickWinner(matchup.id, matchup.team1)}
                >
                  {matchup.team1}
                </button>
                <button
                  className={getButtonClass(matchup, matchup.team2)}
                  onClick={() => onPickWinner(matchup.id, matchup.team2)}
                >
                  {matchup.team2}
                </button>
              </div>
              <button
                onClick={() => onPickWinner(matchup.id, "")}
                className="clear-button"
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="pick-winner-table-container">
        <table className="pick-winner-table">
          <thead>
            <tr>
              <th>Bowl</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((matchup) => (
              <tr key={matchup.game}>
                <td align="center">{matchup.game}</td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup, matchup.team1)}
                    onClick={() => onPickWinner(matchup.id, matchup.team1)}
                  >
                    {matchup.team1}
                  </button>
                </td>
                <td align="center">
                  <button
                    className={getButtonClass(matchup, matchup.team2)}
                    onClick={() => onPickWinner(matchup.id, matchup.team2)}
                  >
                    {matchup.team2}
                  </button>
                </td>
                <td align="center">
                  <button
                    onClick={() => onPickWinner(matchup.id, "")}
                    className="clear-button"
                  >
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PickWinners;
