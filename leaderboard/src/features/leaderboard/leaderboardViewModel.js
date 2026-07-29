export const toLeaderboardEntries = (rows = []) =>
  rows.map((row, index) => {
    const correctPicks = Number(row.correctPicks ?? row.points ?? 0);
    const recordParts = String(row.record || "").split("-");
    const incorrectPicks = Number(row.incorrectPicks ?? recordParts[1]);

    return {
      id: row.id || row.entryId || `${row.username}-${row.entryName}-${index}`,
      rank: Number(row.rank || index + 1),
      previousRank: row.previousRank,
      username: row.username || "Player",
      entryName: row.entryName || "Entry",
      correctPicks,
      incorrectPicks: Number.isFinite(incorrectPicks)
        ? incorrectPicks
        : undefined,
      totalGradedPicks: Number.isFinite(incorrectPicks)
        ? correctPicks + incorrectPicks
        : row.totalGradedPicks,
      tiebreakerPrediction:
        row.tiebreakerPrediction ?? row.tieBreakerValue ?? null,
      tiebreakerDifference:
        Number.isFinite(row.tiebreakerDifference) ||
        row.tiebreakerDifference === Infinity
          ? row.tiebreakerDifference
          : row.tieBreakerDistance,
    };
  });

export const sortLeaderboardEntries = (entries = []) =>
  entries.slice().sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    // TODO: Final tied ordering should continue to come from the official
    // backend/scoring utility once tiebreaker fields are fully connected.
    return 0;
  });
