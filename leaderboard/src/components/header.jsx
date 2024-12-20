import React from 'react';
import '../assets/styles.css'

const Header = ({ currentPage, setCurrentPage }) => {
  return (
    <div className="header">
      <div className="header-title">
        <h1>Bob's Bowl Game Pick 'em 🏈</h1>
      </div>
      <div className="header-nav">
        <button
          className={`nav-link ${currentPage === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`nav-link ${currentPage === 'schedule-view' ? 'active' : ''}`}
          onClick={() => setCurrentPage('schedule-view')}
        >
          Games
        </button>
        <button
          className={`nav-link ${currentPage === 'full-view' ? 'active' : ''}`}
          onClick={() => setCurrentPage('full-view')}
        >
          Full View
        </button>
        <button
          className={`nav-link ${currentPage === 'pick-winners' ? 'active' : ''}`}
          onClick={() => setCurrentPage('pick-winners')}
        >
         Pick Winners
        </button>
      </div>
    </div>
  );
};

export default Header;
