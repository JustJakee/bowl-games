import LeaderboardIdentity from "./LeaderboardIdentity";
import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";

const LeaderboardMobileList = ({ entries, showFourthPrize, isLive }) => (
  <div
    className={`leaderboard-mobile-list${
      isLive ? "" : " leaderboard-mobile-list--prelive"
    }`}
    aria-label="Leaderboard entries"
  >
    <div className="leaderboard-mobile-list-header">
      <span>Rank</span>
      <span>{isLive ? "User & Entry" : "Player"}</span>
      {isLive ? <span>Correct Picks</span> : null}
    </div>
    {entries.map((entry) => {
      const prize = showFourthPrize && entry.rank === 4 ? getPrizeForRank(4) : null;

      return (
        <article className="leaderboard-mobile-row" key={entry.id}>
          <div className="leaderboard-mobile-rank">{entry.rank}</div>
          <LeaderboardIdentity entry={entry} showEntryName={isLive} />
          {isLive ? (
            <div className="leaderboard-mobile-score">
              <strong>{entry.correctPicks}</strong>
              <LeaderboardPrizeTag amount={prize} compact />
            </div>
          ) : null}
        </article>
      );
    })}
  </div>
);

export default LeaderboardMobileList;
