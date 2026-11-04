// Preserved 2025 podium from the previous site. Future years are read from
// completed Gen 2 seasons; do not add forecast winners here.
const legacy2025 = {
  season: { id: "legacy-2025", year: 2025, name: "Bowl Season 2025" },
  tiebreakerTotal: 61,
  winners: [
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
    { place: 3, name: "Blythe", picks: 24, winnings: 30, tiebreakerGuess: 57 },
    {
      place: 4,
      name: "Roll Tide!!!",
      picks: 24,
      winnings: 10,
      tiebreakerGuess: 53,
    },
  ],
};

export const legacyPreviousSeasonResults = (currentSeason) => {
  if (currentSeason?.year !== legacy2025.season.year + 1) return null;
  return {
    ...legacy2025,
    winners: legacy2025.winners.map((winner) => ({
      ...winner,
      tiebreakerMargin: Math.abs(
        legacy2025.tiebreakerTotal - winner.tiebreakerGuess,
      ),
    })),
  };
};
