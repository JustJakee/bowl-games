import React, { useState } from 'react';
import '../assets/styles.css';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const Header = ({ currentPage, setCurrentPage }) => {

  const [open, setOpen] = useState(false);

  const handleTooltipOpen = () => setOpen(true);
  const handleTooltipClose = () => setOpen(false);

  return (
    <div className="header">
      <div className="banner">
        <span>Demo Mode</span>
        <Tooltip
          title={
            <h3 style={{ color: "white" }}>
              The website is not up to date and will resume next season.
            </h3>
          }
          open={open}
          onClose={handleTooltipClose}
          arrow
        >
          <IconButton
            sx={{ color: "white" }}
            onClick={handleTooltipOpen}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </div>
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
