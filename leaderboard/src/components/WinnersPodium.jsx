import "../styles/winners-podium.css";

const TIEBREAKER_TOTAL = 61;

const WINNERS = [
  {
    place: 1,
    name: "Jeff Gumm",
    picks: 25,
    winnings: 110,
    tiebreakerGuess: 48,
  },
  {
    place: 2,
    name: "David Newell",
    picks: 25,
    winnings: 50,
    tiebreakerGuess: 42,
  },
  {
    place: 3,
    name: "Blythe",
    picks: 24,
    winnings: 30,
    tiebreakerGuess: 57,
  },
  {
    place: 4,
    name: "Roll Tide!!!",
    picks: 24,
    winnings: 10,
    tiebreakerGuess: 53,
  },
];

const PLACE_LABELS = {
  1: "1st Place",
  2: "2nd Place",
  3: "3rd Place",
  4: "4th Place",
};

const WinnersPodium = () => {
  const winners = WINNERS.map((winner) => ({
    ...winner,
    tiebreakerMargin: Math.abs(TIEBREAKER_TOTAL - winner.tiebreakerGuess),
  })).sort((a, b) => a.place - b.place);

  return (
    <section className="winners-podium" aria-label="Season winners podium">
      <div className="winners-podium__header">
        <p className="winners-podium__eyebrow">Bowl Season 2025</p>
        <h2 className="winners-podium__title">
          BOWL SEASON IS OVER SEE YOU NEXT YEAR
        </h2>
        <p className="winners-podium__subtitle">CONGRATS TO OUR WINNERS!</p>
        <p className="winners-podium__meta">
          Tiebreaker total: {TIEBREAKER_TOTAL}
        </p>
      </div>

      <div className="winners-podium__grid-card">
        <div className="winners-podium__grid">
          {winners.map((winner) => (
            <div
              key={winner.place}
              className={`winners-podium__card winners-podium__card--grid place-${winner.place}`}
            >
              <div className="winners-podium__place">{PLACE_LABELS[winner.place]}</div>
              <div className="winners-podium__name">{winner.name}</div>
              <div className="winners-podium__badges">
                <span className="winners-podium__badge">
                  {winner.picks} picks
                </span>
                <span className="winners-podium__badge winners-podium__badge--margin">
                  Tie Breaker Margin {winner.tiebreakerMargin}
                </span>
                <span className="winners-podium__badge winners-podium__badge--cash">
                  {`$${winner.winnings} winnings`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WinnersPodium;
