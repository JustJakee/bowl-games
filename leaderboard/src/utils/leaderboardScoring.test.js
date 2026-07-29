import assert from "node:assert/strict";
import test from "node:test";
import { scoreEntries } from "./leaderboardScoring.js";
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard.js";

const games = [
  {
    id: "game-1",
    bowl: "First Bowl",
    winnerTeam: "AAA",
    isFinal: true,
    home: { score: 21 },
    away: { score: 14 },
  },
  {
    id: "game-2",
    bowl: TIEBREAKER_BOWL_NAME,
    winnerTeam: "BBB",
    isFinal: true,
    home: { score: 28 },
    away: { score: 24 },
  },
];

test("leaderboard excludes entries without a complete submitted pick set", () => {
  const rows = scoreEntries({
    games,
    usernamesByOwner: {
      ownerA: "Complete Player",
      ownerB: "Partial Player",
      ownerC: "No Tiebreaker Player",
    },
    entries: [
      {
        id: "entry-complete",
        owner: "ownerA",
        entryName: "Complete Entry",
        tieBreakerValue: 53,
      },
      {
        id: "entry-partial",
        owner: "ownerB",
        entryName: "Partial Entry",
        tieBreakerValue: 53,
      },
      {
        id: "entry-no-tiebreaker",
        owner: "ownerC",
        entryName: "No Tiebreaker Entry",
        tieBreakerValue: null,
      },
    ],
    picks: [
      {
        entryId: "entry-complete",
        gameId: "game-1",
        selectedTeam: "AAA",
      },
      {
        entryId: "entry-complete",
        gameId: "game-2",
        selectedTeam: "BBB",
      },
      {
        entryId: "entry-partial",
        gameId: "game-1",
        selectedTeam: "AAA",
      },
      {
        entryId: "entry-no-tiebreaker",
        gameId: "game-1",
        selectedTeam: "AAA",
      },
      {
        entryId: "entry-no-tiebreaker",
        gameId: "game-2",
        selectedTeam: "BBB",
      },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.entryId, row.username, row.points, row.record]),
    [["entry-complete", "Complete Player", 2, "2-0"]],
  );
});
