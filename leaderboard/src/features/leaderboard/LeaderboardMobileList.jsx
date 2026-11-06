import LeaderboardIdentity from "./LeaderboardIdentity";
import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";

const LeaderboardMobileList = ({ entries, payoutsByPosition = {}, isLive }) => (
  <div
    className={`leaderboard-mobile-list${
      isLive ? "" : " leaderboard-mobile-list--prelive"
    }`}
    aria-label="Leaderboard entries"
  >
    <div className="leaderboard-mobile-list-header">
      <span>Rank</span>
      <span>Player</span>
      {isLive ? <span>Correct Picks</span> : null}
    </div>
    {entries.map((entry) => {
      const prize = getPrizeForRank(payoutsByPosition, entry.rank);

      return (
        <article className="leaderboard-mobile-row" key={entry.id}>
          <div className="leaderboard-mobile-rank">{entry.rank}</div>
          <LeaderboardIdentity entry={entry} />
          {isLive ? (
            <div className="leaderboard-mobile-score">
              <strong>{entry.correctPicks}</strong>
              <LeaderboardPrizeTag amountCents={prize} compact />
            </div>
          ) : null}
        </article>
      );
    })}
  </div>
);

export default LeaderboardMobileList;
