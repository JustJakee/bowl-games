import React, { useState, useEffect } from 'react';
import gamesWithTimes from '../constants/gamesWithTimes';
import { FaCheckCircle } from "react-icons/fa"; // Icons for completed games
import { MdFiberManualRecord } from "react-icons/md"; // Red dot for live games

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
        const currentDate = new Date();
        const gameDate = new Date(gameTime);
        const timeDifference = gameDate - currentDate;
    
        if (timeDifference < -5 * 60 * 60 * 1000) {
            return 'completed'; // More than 5 hours ago
        } 
        else if (timeDifference <= 5 * 60 * 60 * 1000) {
            return 'live'; // Between 0 and 5 hours in the future
        } 
        else {
            return 'upcoming'; // More than 5 hours from now
        }
    };

    return (
        <div className="schedule-container">
            {matchups.map((matchup, index) => {
                const gameTime = gamesWithTimes.find(time => time.game === matchup.game);
                const gameStatus = gameTime ? getGameStatus(gameTime.time) : null;

                return (
                    <div
                        className={`schedule-card ${matchup.winner ? 'completed' : ''}`}
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
                                        <span
                                            className="material-icons-outlined"
                                            style={{
                                                position: 'absolute',
                                                top: 10,
                                                right: 10,
                                                fontSize: '24px',
                                                color: '#e8eaed',
                                            }}
                                        >
                                            calendar_today
                                        </span>
                                    )}
                                    {gameStatus === 'live' && <MdFiberManualRecord style={{ color: 'red', position: 'absolute', top: 10, right: 10, fontSize: '20px' }} />}
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
