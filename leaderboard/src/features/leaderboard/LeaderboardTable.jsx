import LeaderboardIdentity from "./LeaderboardIdentity";
import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";

const LeaderboardTable = ({ entries, payoutsByPosition = {}, isLive }) => (
  <div className="leaderboard-table-wrap">
    <table
      className={`leaderboard-table${isLive ? "" : " leaderboard-table--prelive"}`}
    >
      <thead>
        <tr>
          <th>Rank</th>
          <th>Username</th>
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
          const prize = getPrizeForRank(payoutsByPosition, entry.rank);
          const hasRecord = Number.isFinite(entry.incorrectPicks);

          return (
            <tr key={entry.id}>
              <td className="leaderboard-rank-cell">{entry.rank}</td>
              <td>
                <LeaderboardIdentity entry={entry} />
              </td>
              {isLive ? (
                <>
                  <td>
                    <div className="leaderboard-score-cell">
                      <strong>{entry.correctPicks}</strong>
                      <LeaderboardPrizeTag amountCents={prize} compact />
                    </div>
                  </td>
                  <td>
                    {hasRecord
                      ? `${entry.correctPicks}-${entry.incorrectPicks}`
                      : "-"}
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
