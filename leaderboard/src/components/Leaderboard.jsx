import { CircularProgress } from "@mui/material";
import firstMedal from "../assets/medals/first.png";
import secondMedal from "../assets/medals/second.png";
import thirdMedal from "../assets/medals/third.png";
import "../styles/leaderboard.css";

const Leaderboard = ({ playerPicks, matchups, loading = false }) => {
  const noWinners = matchups.map((game) => game.winner).includes("");
  const computeScore = (player) => {
    let score = 0;
    const len = Math.min(player.picks.length, matchups.length);
    for (let i = 0; i < len; i++) {
      const winner = matchups[i]?.winner;
      if (winner && winner === player.picks[i]) score++;
    }
    return score;
  };

  const playersWithScores = (playerPicks || [])
    .map((p) => ({
      ...p,
      score: computeScore(p),
    }))
    .sort((a, b) => b.score - a.score);

  const top3 = playersWithScores.slice(0, 3);
  const rest = playersWithScores.slice(3);

  const medalSrc = {
    1: firstMedal,
    2: secondMedal,
    3: thirdMedal,
  };

  if (loading) {
    return (
      <div className="leaderboard-v2 loading-state">
        <CircularProgress size={20} />
        <span>Loading leaderboard…</span>
      </div>
    );
  }

  return (
    <>
      {/* Only show podium if winners exist */}
      {noWinners ? (
        <div className="leaderboard-v2">
          <div className="leaderboard-rows">
            <div className="rows-header" role="row">
              <div className="rank-col" role="columnheader">
                Rank
              </div>
              <div className="player-col" role="columnheader">
                Player
              </div>
              <div className="score-col" role="columnheader">
                Correct Picks
              </div>
            </div>
            {playersWithScores.map((player, rank) => (
              <div
                key={player.name}
                className={`row-item`}
              >
                <div className="rank-badge">{rank + 1}</div>
                <div className="row-name">{player.name}</div>
                <div className="spacer" />
                <div className="score-pill-submitted">Picks Submitted</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="leaderboard-v2">
          <div className="podium">
            {top3[1] && (
              <div className="podium-card second">
                <img
                  className="avatar-image"
                  src={medalSrc[2]}
                  alt="Second place medal"
                  width="84"
                  height="84"
                />
                <div className="name">{top3[1].name}</div>
                <div className="meta">{top3[1].score} picks</div>
              </div>
            )}
            {top3[0] && (
              <div className="podium-card first">
                <img
                  className="avatar-image"
                  src={medalSrc[1]}
                  alt="First place medal"
                  width="84"
                  height="84"
                />
                <div className="name">{top3[0].name}</div>
                <div className="meta">{top3[0].score} picks</div>
              </div>
            )}
            {top3[2] && (
              <div className="podium-card third">
                <img
                  className="avatar-image"
                  src={medalSrc[3]}
                  alt="Third place medal"
                  width="84"
                  height="84"
                />
                <div className="name">{top3[2].name}</div>
                <div className="meta">{top3[2].score} picks</div>
              </div>
            )}
          </div>

          <div className="leaderboard-rows">
            <div className="rows-header" role="row">
              <div className="rank-col" role="columnheader">
                Rank
              </div>
              <div className="player-col" role="columnheader">
                Player
              </div>
              <div className="score-col" role="columnheader">
                Correct Picks
              </div>
            </div>
            {rest.map((player, rank) => (
              <div
                key={player.name}
                className={`row-item ${rank === 0 ? "fourth" : ""}`}
              >
                <div className="rank-badge">{rank + 4}</div>
                <div className="row-name">{player.name}</div>
                {rank === 0 && <span className="prize-badge">$10</span>}
                <div className="spacer" />
                <div className="score-pill">{player.score} picks</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Leaderboard;
