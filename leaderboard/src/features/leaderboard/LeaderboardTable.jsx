import LeaderboardIdentity from "./LeaderboardIdentity";
import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";

const LeaderboardTable = ({ entries, showFourthPrize, isLive }) => (
  <div className="leaderboard-table-wrap">
    <table className={`leaderboard-table${isLive ? "" : " leaderboard-table--prelive"}`}>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Username</th>
          <th>Picks</th>
          {isLive ? (
            <>
              <th>Correct Picks</th>
              <th>Record</th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const prize = showFourthPrize && entry.rank === 4 ? getPrizeForRank(4) : null;
          const hasRecord = Number.isFinite(entry.incorrectPicks);

          return (
            <tr key={entry.id}>
              <td className="leaderboard-rank-cell">{entry.rank}</td>
              <td>
                <LeaderboardIdentity entry={entry} showEntryName={false} />
              </td>
              <td>
                <span className="leaderboard-table-entry">{entry.entryName}</span>
              </td>
              {isLive ? (
                <>
                  <td>
                    <div className="leaderboard-score-cell">
                      <strong>{entry.correctPicks}</strong>
                      <LeaderboardPrizeTag amount={prize} compact />
                    </div>
                  </td>
                  <td>
                    {hasRecord ? `${entry.correctPicks}-${entry.incorrectPicks}` : "-"}
                  </td>
                </>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default LeaderboardTable;
