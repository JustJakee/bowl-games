import React from 'react';
import gamesWithTimes from '../constants/gamesWithTimes';

const ScheduleView = ({ matchups }) => {
    const formatTime = (time) => {
        const date = new Date(time);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZone: 'America/Chicago',
        });
    };

    return (
        <div className="schedule-container">
            {matchups.map((matchup, index) => {
                const gameTime = gamesWithTimes.find(time => time.gameId === matchup.gameId);
                return (
                    <div
                        className={`schedule-card ${matchup.winner ? 'completed' : ''}`}
                        key={index}
                    >
                        <h3 className="game-title">{matchup.game}</h3>
                        <div className="teams">
                            <span className={`team ${matchup.winner === matchup.team1 ? 'winner' : matchup.winner === matchup.team2 ? 'loser' : ''}`}>
                                {matchup.team1}
                            </span>
                            <span className="vs">vs</span>
                            <span className={`team ${matchup.winner === matchup.team2 ? 'winner' : matchup.winner === matchup.team1 ? 'loser' : ''}`}>
                                {matchup.team2}
                            </span>
                        </div>
                        <div className="game-info">
                            {gameTime && <span className="game-time">{formatTime(gameTime.time)} CST</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ScheduleView;
