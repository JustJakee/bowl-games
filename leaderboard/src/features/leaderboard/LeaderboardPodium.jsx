import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";
import { displayLeaderboardUsername } from "./leaderboardViewModel";

const PODIUM_ORDER = [2, 1, 3];

const rankLabel = {
  1: "First place",
  2: "Second place",
  3: "Third place",
};

const PodiumEntryCard = ({ entry, payoutsByPosition }) => {
  const prize = getPrizeForRank(payoutsByPosition, entry.rank);

  return (
    <article className={`podium-entry podium-entry--rank-${entry.rank}`}>
      <div className="podium-medal" aria-label={rankLabel[entry.rank]}>
        <span>{entry.rank}</span>
      </div>
      <div className="podium-copy">
        <h2>{displayLeaderboardUsername(entry.username)}</h2>
      </div>
      <div className="podium-score">
        <strong>{entry.correctPicks}</strong>
        <span>Correct Picks</span>
      </div>
      {prize !== null ? <div className="podium-prize">
        <LeaderboardPrizeTag amountCents={prize} />
        <span>Current payout</span>
      </div> : null}
    </article>
  );
};

const LeaderboardPodium = ({ entries, payoutsByPosition = {} }) => {
  const entriesByRank = new Map(entries.map((entry) => [entry.rank, entry]));
  const orderedEntries = PODIUM_ORDER.map((rank) =>
    entriesByRank.get(rank),
  ).filter(Boolean);

  if (orderedEntries.length === 0) return null;

  return (
    <section
      className="leaderboard-podium"
      aria-label="Top three leaderboard entries"
    >
      {orderedEntries.map((entry) => (
        <PodiumEntryCard key={entry.id} entry={entry} payoutsByPosition={payoutsByPosition} />
      ))}
    </section>
  );
};

export default LeaderboardPodium;
