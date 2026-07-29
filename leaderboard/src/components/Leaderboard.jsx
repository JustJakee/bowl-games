// UI - LEADERBOARD - REACT
import { CircularProgress } from "@mui/material";
import LeaderboardMobileList from "../features/leaderboard/LeaderboardMobileList";
import LeaderboardPodium from "../features/leaderboard/LeaderboardPodium";
import LeaderboardTable from "../features/leaderboard/LeaderboardTable";
import { sortLeaderboardEntries } from "../features/leaderboard/leaderboardViewModel";
import "../styles/leaderboard.css";

const Leaderboard = ({ entries, loading = false, isLive = false }) => {
  const sortedEntries = sortLeaderboardEntries(entries);
  const topThree = isLive ? sortedEntries.slice(0, 3) : [];
  const remainingEntries = isLive ? sortedEntries.slice(3) : sortedEntries;

  if (loading) {
    return (
      <div className="leaderboard-loading" role="status">
        <CircularProgress size={22} />
        <span>Loading leaderboard</span>
      </div>
    );
  }

  if (sortedEntries.length === 0) {
    return (
      <section className="leaderboard-empty-state">
        <h2>No leaderboard entries yet</h2>
        <p>Standings will appear after entries and picks have been saved.</p>
      </section>
    );
  }

  return (
    <div className="leaderboard-content">
      {isLive ? <LeaderboardPodium entries={topThree} /> : null}
      <section className="leaderboard-standings" aria-label="Leaderboard standings">
        <LeaderboardTable
          entries={remainingEntries}
          showFourthPrize={isLive}
          isLive={isLive}
        />
        <LeaderboardMobileList
          entries={remainingEntries}
          showFourthPrize={isLive}
          isLive={isLive}
        />
        {isLive ? (
          <p className="leaderboard-prize-note">
            Winnings reflect the current prize payout structure for this season.
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default Leaderboard;
