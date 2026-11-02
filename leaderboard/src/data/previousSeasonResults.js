import { dataClient } from "../auth/amplifyConfig";
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard";
import { mapStoredGamesToDisplayGames } from "../utils/formatGameData";
import { scoreEntries } from "../utils/leaderboardScoring";
import { choosePreviousSeason } from "../utils/previousSeason";
import { loadSeasonLeaderboardData } from "./leaderboardRepository";
import { legacyPreviousSeasonResults } from "./historicalResults";
import { listRawSeasonGames } from "./seasonRepository";

export const loadPreviousSeasonResults = async (currentSeason) => {
  if (!currentSeason?.year) return null;
  const seasons = [];
  let nextToken;
  do {
    const result = await dataClient.models.Season.list({ limit: 100, nextToken, selectionSet: ["id", "year", "name", "status"], authMode: "userPool" });
    if (result?.errors?.length) throw new Error(result.errors[0].message);
    if (!result) throw new Error("Unable to load previous seasons.");
    seasons.push(...(result.data || []).filter(Boolean));
    nextToken = result.nextToken;
  } while (nextToken);
  const season = choosePreviousSeason(seasons, currentSeason);
  const legacy = legacyPreviousSeasonResults(currentSeason);
  if (legacy && (!season || season.year < legacy.season.year)) return legacy;
  if (!season) return null;
  const [rawGames, leaderboard] = await Promise.all([
    listRawSeasonGames({ seasonId: season.id }),
    loadSeasonLeaderboardData({ seasonId: season.id }),
  ]);
  const games = mapStoredGamesToDisplayGames(rawGames).filter((game) => !game.bowl.includes("FCS Championship"));
  const winners = scoreEntries({ ...leaderboard, games }).slice(0, 4).map((row) => ({
    place: row.rank,
    name: row.username,
    picks: row.points,
    tiebreakerMargin: Number.isFinite(row.tieBreakerDistance) ? row.tieBreakerDistance : null,
  }));
  const tiebreakerGame = rawGames.find((game) => game.bowlName === TIEBREAKER_BOWL_NAME && game.status === "final");
  const scores = [tiebreakerGame?.teamAScore, tiebreakerGame?.teamBScore];
  const tiebreakerTotal = scores.every((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
    ? Number(scores[0]) + Number(scores[1]) : null;
  if (winners.length === 0 && legacy && season.year === legacy.season.year) return legacy;
  return { season, winners, tiebreakerTotal };
};
