import { displayLeaderboardUsername } from "./leaderboardViewModel";

const LeaderboardIdentity = ({ entry, size = "md" }) => (
  <div className={`leaderboard-identity leaderboard-identity--${size}`}>
    <div className="leaderboard-identity-copy">
      <div className="leaderboard-username">
        {displayLeaderboardUsername(entry.username)}
      </div>
    </div>
  </div>
);

export default LeaderboardIdentity;
