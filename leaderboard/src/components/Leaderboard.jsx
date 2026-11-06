// UI - LEADERBOARD - REACT
import { CircularProgress } from "@mui/material";
import LeaderboardMobileList from "../features/leaderboard/LeaderboardMobileList";
import LeaderboardPodium from "../features/leaderboard/LeaderboardPodium";
import LeaderboardTable from "../features/leaderboard/LeaderboardTable";
import { sortLeaderboardEntries } from "../features/leaderboard/leaderboardViewModel";
import "../styles/leaderboard.css";

const Leaderboard = ({ entries, loading = false, isLive = false, payoutsByPosition = {} }) => {
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
        <h2>No standings yet</h2>
        <p>Standings will appear after players complete their picks.</p>
      </section>
    );
  }

  return (
    <div className="leaderboard-content">
      {isLive ? <LeaderboardPodium entries={topThree} payoutsByPosition={payoutsByPosition} /> : null}
      <section
        className="leaderboard-standings"
        aria-label="Leaderboard standings"
      >
        <LeaderboardTable
          entries={remainingEntries}
          payoutsByPosition={payoutsByPosition}
          isLive={isLive}
        />
        <LeaderboardMobileList
          entries={remainingEntries}
          payoutsByPosition={payoutsByPosition}
          isLive={isLive}
        />
        {isLive && Object.keys(payoutsByPosition).length > 0 ? (
          <p className="leaderboard-prize-note">
            Current payouts may change as confirmed paid entries change.
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default Leaderboard;
