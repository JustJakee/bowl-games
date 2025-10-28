import React from 'react';
import teamNamesDict from '../constants/teamNames';

const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();

const Leaderboard = ({ playerPicks, matchups }) => { 
  const computeScore = (player) => {
    let score = 0;
    const len = Math.min(player.picks.length, matchups.length);
    for (let i = 0; i < len; i++) {
      const winner = matchups[i]?.winner;
      if (winner && teamNamesDict[winner] === player.picks[i]) score++;
    }
    return score;
  };

  const playersWithScores = (playerPicks || []).map(p => ({
    ...p,
    score: computeScore(p)
  })).sort((a, b) => b.score - a.score);

  const top3 = playersWithScores.slice(0, 3);
  const rest = playersWithScores.slice(3);

  return (
    <div className="leaderboard-v2">
      <div className="podium">
        {top3[1] && (
          <div className="podium-card second">
            <div className="avatar" aria-hidden>{initials(top3[1].name)}</div>
            <div className="name">{top3[1].name}</div>
            <div className="meta"><span className="trophy">🥈</span> {top3[1].score} pts</div>
          </div>
        )}
        {top3[0] && (
          <div className="podium-card first">
            <div className="avatar" aria-hidden>{initials(top3[0].name)}</div>
            <div className="name">{top3[0].name}</div>
            <div className="meta"><span className="trophy">🥇</span> {top3[0].score} pts</div>
          </div>
        )}
        {top3[2] && (
          <div className="podium-card third">
            <div className="avatar" aria-hidden>{initials(top3[2].name)}</div>
            <div className="name">{top3[2].name}</div>
            <div className="meta"><span className="trophy">🥉</span> {top3[2].score} pts</div>
          </div>
        )}
      </div>

      <div className="leaderboard-rows">
        {rest.map((p, idx) => (
          <div key={p.name} className="row-item">
            <div className="rank-badge">{idx + 4}</div>
            <div className="row-name">{p.name}</div>
            <div className="spacer" />
            <div className="score-pill">{p.score} pts</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;

