import { dataClient } from "../auth/amplifyConfig";
import { mapStoredGamesToDisplayGames } from "../utils/formatGameData";

export const ACTIVE_SEASON_SLUG =
  import.meta.env.VITE_ACTIVE_SEASON_SLUG || "test26";

export const TEST_SEASON_ID = "test26";

const SEASON_SELECTION = ["id", "year", "name", "slug", "status", "isActive"];

const SEASON_CONFIG_SELECTION = [
  "id",
  "seasonId",
  "picksOpenAt",
  "picksLockAt",
  "maxEntriesPerUser",
  "tieBreakerLabel",
  "tieBreakerRequired",
  "scoringConfigJson",
];

export const GAME_SELECTION = [
  "id",
  "seasonId",
  "sourceEventId",
  "gameNumber",
  "sortOrder",
  "bowlName",
  "gameName",
  "network",
  "status",
  "statusDetail",
  "teamA",
  "teamADisplayName",
  "teamAAbbr",
  "teamALogo",
  "teamAColor",
  "teamAAlternateColor",
  "teamARank",
  "teamAScore",
  "teamB",
  "teamBDisplayName",
  "teamBAbbr",
  "teamBLogo",
  "teamBColor",
  "teamBAlternateColor",
  "teamBRank",
  "teamBScore",
  "kickoffAt",
  "neutralSite",
  "venueName",
  "location",
  "winnerTeam",
  "createdAt",
  "updatedAt",
];

const getFirstGraphQLError = (result) => result?.errors?.[0]?.message || null;

const throwIfGraphQLError = (result, fallbackMessage) => {
  const errorMessage = getFirstGraphQLError(result);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (!result) {
    throw new Error(fallbackMessage);
  }
};

export const listRawSeasonGames = async ({ seasonId }) => {
  if (!seasonId) {
    return [];
  }

  const client = dataClient;
  const result = await client.models.Game.list({
    filter: {
      seasonId: { eq: seasonId },
    },
    selectionSet: GAME_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(result, "Unable to load season games.");

  return (result.data || [])
    .filter(Boolean)
    .slice()
    .sort((left, right) => {
      const leftOrder = left?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right?.sortOrder ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftTime = left?.kickoffAt
        ? new Date(left.kickoffAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right?.kickoffAt
        ? new Date(right.kickoffAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    });
};

export const getGameById = async ({ gameId }) => {
  if (!gameId) {
    return null;
  }

  const client = dataClient;
  const result = await client.models.Game.get(
    { id: gameId },
    {
      selectionSet: GAME_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to load the requested game.");
  return result.data || null;
};

export const getSeasonBySlug = async ({ slug = ACTIVE_SEASON_SLUG } = {}) => {
  const client = dataClient;
  const result = await client.models.Season.seasonBySlug(
    { slug },
    {
      limit: 1,
      selectionSet: SEASON_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to load the active season.");
  return result.data?.[0] ?? null;
};

export const getSeasonConfig = async ({ seasonId }) => {
  if (!seasonId) {
    return null;
  }

  const client = dataClient;
  const result = await client.models.SeasonConfig.seasonConfigBySeasonId(
    { seasonId },
    {
      limit: 1,
      selectionSet: SEASON_CONFIG_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to load the season configuration.");
  return result.data?.[0] ?? null;
};

export const loadSeasonBundle = async ({ slug = ACTIVE_SEASON_SLUG } = {}) => {
  const season = await getSeasonBySlug({ slug });

  if (!season) {
    throw new Error(
      `Active season "${slug}" was not found. Seed it before loading the app.`,
    );
  }

  const [seasonConfig, rawGames] = await Promise.all([
    getSeasonConfig({ seasonId: season.id }),
    listRawSeasonGames({ seasonId: season.id }),
  ]);

  return {
    season,
    seasonConfig,
    rawGames,
    games: mapStoredGamesToDisplayGames(rawGames),
  };
};
