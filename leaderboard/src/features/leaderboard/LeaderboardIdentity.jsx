const LeaderboardIdentity = ({ entry, size = "md", showEntryName = true }) => (
  <div className={`leaderboard-identity leaderboard-identity--${size}`}>
    <div className="leaderboard-identity-copy">
      <div className="leaderboard-username">{entry.username}</div>
      {showEntryName ? (
        <div className="leaderboard-entry-name">{entry.entryName}</div>
      ) : null}
    </div>
  </div>
);

export default LeaderboardIdentity;
