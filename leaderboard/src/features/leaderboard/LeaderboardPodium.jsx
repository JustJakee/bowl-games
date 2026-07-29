import LeaderboardPrizeTag from "./LeaderboardPrizeTag";
import { getPrizeForRank } from "./leaderboardPrizes";

const PODIUM_ORDER = [2, 1, 3];

const rankLabel = {
  1: "First place",
  2: "Second place",
  3: "Third place",
};

const PodiumEntryCard = ({ entry }) => {
  const prize = getPrizeForRank(entry.rank);

  return (
    <article className={`podium-entry podium-entry--rank-${entry.rank}`}>
      <div className="podium-medal" aria-label={rankLabel[entry.rank]}>
        <span>{entry.rank}</span>
      </div>
      <div className="podium-copy">
        <h2>{entry.username}</h2>
        <p>{entry.entryName}</p>
      </div>
      <div className="podium-score">
        <strong>{entry.correctPicks}</strong>
        <span>Correct Picks</span>
      </div>
      <div className="podium-prize">
        <LeaderboardPrizeTag amount={prize} />
        <span>Winnings</span>
      </div>
    </article>
  );
};

const LeaderboardPodium = ({ entries }) => {
  const entriesByRank = new Map(entries.map((entry) => [entry.rank, entry]));
  const orderedEntries = PODIUM_ORDER.map((rank) => entriesByRank.get(rank)).filter(Boolean);

  if (orderedEntries.length === 0) return null;

  return (
    <section className="leaderboard-podium" aria-label="Top three leaderboard entries">
      {orderedEntries.map((entry) => (
        <PodiumEntryCard key={entry.id} entry={entry} />
      ))}
    </section>
  );
};

export default LeaderboardPodium;
