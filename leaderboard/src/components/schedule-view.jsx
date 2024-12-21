import React from 'react';
import gamesWithTimes from '../constants/gamesWithTimes';
import { FaCheckCircle } from "react-icons/fa";
import { RiCalendarScheduleFill } from "react-icons/ri";

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

    const getGameStatus = (gameTime) => {
        const currentTime = new Date(); // Current time
        const gameStartTime = new Date(gameTime); // Game start time
        const gameEndTime = new Date(gameStartTime.getTime() + 5 * 60 * 60 * 1000); // 5 hours after game start

        if (currentTime >= gameStartTime && currentTime <= gameEndTime) {
            return 'live';
        } else if (currentTime < gameStartTime) {
            return 'upcoming';
        } else {
            return 'completed';
        }
    };

    return (
        <div className="schedule-container">
            {matchups.map((matchup, index) => {
                const gameTime = gamesWithTimes.find(time => time.game === matchup.game);
                const gameStatus = gameTime ? getGameStatus(gameTime.time) : null;

                return (
                    <div
                        className={`schedule-card ${gameStatus === 'live' ? 'live' : ''} ${matchup.winner ? 'completed' : ''}`}
                        key={index}
                        style={{ position: 'relative', padding: '20px' }}
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
                            {gameTime && (
                                <>
                                    <span className="game-time">{formatTime(gameTime.time)} CST</span>
                                    {gameStatus === 'completed' && <FaCheckCircle style={{ color: 'green', position: 'absolute', top: 10, right: 10, fontSize: '20px' }} />}
                                    {gameStatus === 'upcoming' && (
                                        <RiCalendarScheduleFill
                                            className="material-icons-outlined"
                                            style={{
                                                position: 'absolute',
                                                top: 10,
                                                right: 10,
                                                fontSize: '24px',
                                                color: '#b9b9b9',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ScheduleView;
