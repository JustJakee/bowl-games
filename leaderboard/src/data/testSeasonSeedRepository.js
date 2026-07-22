// SEED — TEST26 — AMPLIFY DATA
// The seed targets the backend referenced by the active amplify_outputs.json and upserts stable records.
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { TEST_SEASON_ID } from "./seasonRepository";
import { TIEBREAKER_BOWL_NAME } from "../constants/PickMatchupCard";

const TEST_SEASON_NAME = "2026 Test Season";
const TEST_SEASON_SLUG = "test26";
const TEST_SEASON_CONFIG_ID = `season-config-${TEST_SEASON_ID}`;

const getDataClient = () => {
  return configuredDataClient;
};

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

const parseScore = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCompetition = (event) => event?.competitions?.[0] || {};

const getCompetitor = (event, homeAway) =>
  getCompetition(event)?.competitors?.find(
    (competitor) => competitor?.homeAway === homeAway,
  ) || {};

const mapEventStatusToGameStatus = (event) => {
  const type = getCompetition(event)?.status?.type || event?.status?.type || {};
  const description = String(type?.description || "").toLowerCase();

  if (description.includes("canceled")) {
    return "canceled";
  }

  if (type?.state === "in") {
    return "in_progress";
  }

  if (type?.state === "post" || type?.completed) {
    return "final";
  }

  return "scheduled";
};

const buildWinnerTeam = (awayCompetitor, homeCompetitor, status) => {
  if (status !== "final") {
    return "";
  }

  const awayScore = parseScore(awayCompetitor?.score);
  const homeScore = parseScore(homeCompetitor?.score);

  if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) {
    return "";
  }

  if (awayScore > homeScore) {
    return awayCompetitor?.team?.abbreviation || "";
  }

  if (homeScore > awayScore) {
    return homeCompetitor?.team?.abbreviation || "";
  }

  return "";
};

const buildLocation = (venue) => {
  const parts = [
    venue?.fullName,
    venue?.address?.city,
    venue?.address?.state,
  ].filter(Boolean);

  return parts.join(" | ");
};

const buildStableGameId = (sourceEventId) =>
  `game-${TEST_SEASON_ID}-${String(sourceEventId || "").trim()}`;

const buildSeedGameRecord = (event, index) => {
  const competition = getCompetition(event);
  const venue = competition?.venue || {};
  const awayCompetitor = getCompetitor(event, "away");
  const homeCompetitor = getCompetitor(event, "home");
  const status = mapEventStatusToGameStatus(event);
  const bowlName =
    competition?.notes?.[0]?.headline ||
    competition?.name ||
    event?.name ||
    "Bowl Game";
  const kickoffAt = competition?.date || event?.date || "";

  return {
    id: buildStableGameId(event?.id),
    seasonId: TEST_SEASON_ID,
    sourceEventId: String(event?.id || ""),
    gameNumber: index + 1,
    sortOrder: index + 1,
    bowlName,
    gameName: event?.name || bowlName,
    network:
      competition?.broadcasts?.[0]?.shortName ||
      competition?.broadcasts?.[0]?.names?.[0] ||
      "",
    status,
    statusDetail:
      competition?.status?.type?.shortDetail ||
      competition?.status?.type?.detail ||
      "",
    teamA:
      awayCompetitor?.team?.displayName ||
      awayCompetitor?.team?.name ||
      awayCompetitor?.team?.abbreviation ||
      "Away",
    teamADisplayName:
      awayCompetitor?.team?.displayName ||
      awayCompetitor?.team?.name ||
      awayCompetitor?.team?.abbreviation ||
      "Away",
    teamAAbbr:
      awayCompetitor?.team?.abbreviation ||
      awayCompetitor?.team?.shortDisplayName ||
      "AWAY",
    teamALogo: awayCompetitor?.team?.logo || "",
    teamAColor: awayCompetitor?.team?.color || "",
    teamAAlternateColor: awayCompetitor?.team?.alternateColor || "",
    teamARank:
      awayCompetitor?.curatedRank?.current &&
      awayCompetitor.curatedRank.current < 99
        ? awayCompetitor.curatedRank.current
        : null,
    teamAScore: parseScore(awayCompetitor?.score),
    teamB:
      homeCompetitor?.team?.displayName ||
      homeCompetitor?.team?.name ||
      homeCompetitor?.team?.abbreviation ||
      "Home",
    teamBDisplayName:
      homeCompetitor?.team?.displayName ||
      homeCompetitor?.team?.name ||
      homeCompetitor?.team?.abbreviation ||
      "Home",
    teamBAbbr:
      homeCompetitor?.team?.abbreviation ||
      homeCompetitor?.team?.shortDisplayName ||
      "HOME",
    teamBLogo: homeCompetitor?.team?.logo || "",
    teamBColor: homeCompetitor?.team?.color || "",
    teamBAlternateColor: homeCompetitor?.team?.alternateColor || "",
    teamBRank:
      homeCompetitor?.curatedRank?.current &&
      homeCompetitor.curatedRank.current < 99
        ? homeCompetitor.curatedRank.current
        : null,
    teamBScore: parseScore(homeCompetitor?.score),
    kickoffAt,
    neutralSite: Boolean(competition?.neutralSite),
    venueName: venue?.fullName || "",
    location: buildLocation(venue),
    winnerTeam: buildWinnerTeam(awayCompetitor, homeCompetitor, status),
  };
};

const buildSeedSeason = (events) => {
  const firstKickoff = events
    .map((event) => getCompetition(event)?.date || event?.date || "")
    .filter(Boolean)
    .sort()[0];

  return {
    season: {
      id: TEST_SEASON_ID,
      year: 2026,
      name: TEST_SEASON_NAME,
      slug: TEST_SEASON_SLUG,
      status: "open",
      entryFeeCents: 0,
      isActive: true,
    },
    seasonConfig: {
      id: TEST_SEASON_CONFIG_ID,
      seasonId: TEST_SEASON_ID,
      picksOpenAt: firstKickoff || "2026-07-21T12:00:00Z",
      picksLockAt: firstKickoff || "2026-12-12T17:00:00Z",
      maxEntriesPerUser: 10,
      tieBreakerLabel: "Total Points Scored",
      tieBreakerRequired: true,
      scoringConfigJson: {
        tieBreakerBowlName: TIEBREAKER_BOWL_NAME,
      },
    },
  };
};

const fieldsDiffer = (existing, nextRecord, fieldNames) =>
  fieldNames.some((fieldName) => {
    const left = existing?.[fieldName];
    const right = nextRecord?.[fieldName];

    if (left === null || left === undefined || left === "") {
      return !(right === null || right === undefined || right === "");
    }

    if (right === null || right === undefined || right === "") {
      return true;
    }

    return left !== right;
  });

const upsertRecord = async ({
  existing,
  nextRecord,
  createAction,
  updateAction,
  createMessage,
  updateMessage,
  comparedFields,
}) => {
  if (!existing) {
    const createResult = await createAction();
    throwIfGraphQLError(createResult, createMessage);
    return { action: "created", record: createResult.data };
  }

  if (!fieldsDiffer(existing, nextRecord, comparedFields)) {
    return { action: "skipped", record: existing };
  }

  const updateResult = await updateAction();
  throwIfGraphQLError(updateResult, updateMessage);
  return { action: "updated", record: updateResult.data };
};

export const seedTestSeason = async () => {
  const { default: mockSeasonData } =
    await import("../assets/mockBowls2026.json");
  const events = Array.isArray(mockSeasonData?.events)
    ? mockSeasonData.events.filter(Boolean)
    : [];
  const client = getDataClient();
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
    seasonId: TEST_SEASON_ID,
    gamesProcessed: events.length,
  };

  const increment = (action) => {
    summary[action] += 1;
  };

  const { season, seasonConfig } = buildSeedSeason(events);

  try {
    const existingSeasonResult = await client.models.Season.get(
      { id: TEST_SEASON_ID },
      { authMode: "userPool" },
    );
    throwIfGraphQLError(
      existingSeasonResult,
      "Unable to load the test season.",
    );

    const seasonResult = await upsertRecord({
      existing: existingSeasonResult.data,
      nextRecord: season,
      createAction: () =>
        client.models.Season.create(season, {
          authMode: "userPool",
        }),
      updateAction: () =>
        client.models.Season.update(season, {
          authMode: "userPool",
        }),
      createMessage: "Unable to create the test season.",
      updateMessage: "Unable to update the test season.",
      comparedFields: [
        "year",
        "name",
        "slug",
        "status",
        "entryFeeCents",
        "isActive",
      ],
    });
    increment(seasonResult.action);
  } catch (error) {
    summary.failed += 1;
    summary.failures.push(`Season: ${error.message}`);
  }

  try {
    const existingSeasonConfigResult =
      await client.models.SeasonConfig.seasonConfigBySeasonId(
        { seasonId: TEST_SEASON_ID },
        {
          limit: 1,
          authMode: "userPool",
        },
      );
    throwIfGraphQLError(
      existingSeasonConfigResult,
      "Unable to load the test season configuration.",
    );
    const existingSeasonConfig = existingSeasonConfigResult.data?.[0] ?? null;
    const seasonConfigResult = await upsertRecord({
      existing: existingSeasonConfig,
      nextRecord: seasonConfig,
      createAction: () =>
        client.models.SeasonConfig.create(seasonConfig, {
          authMode: "userPool",
        }),
      updateAction: () =>
        client.models.SeasonConfig.update(
          {
            id: existingSeasonConfig?.id || seasonConfig.id,
            ...seasonConfig,
          },
          {
            authMode: "userPool",
          },
        ),
      createMessage: "Unable to create the test season configuration.",
      updateMessage: "Unable to update the test season configuration.",
      comparedFields: [
        "seasonId",
        "picksOpenAt",
        "picksLockAt",
        "maxEntriesPerUser",
        "tieBreakerLabel",
        "tieBreakerRequired",
      ],
    });
    increment(seasonConfigResult.action);
  } catch (error) {
    summary.failed += 1;
    summary.failures.push(`SeasonConfig: ${error.message}`);
  }

  const existingGamesResult = await client.models.Game.list({
    filter: {
      seasonId: { eq: TEST_SEASON_ID },
    },
    authMode: "userPool",
  });
  throwIfGraphQLError(
    existingGamesResult,
    "Unable to load existing test games.",
  );

  const existingGamesById = new Map(
    (existingGamesResult.data || [])
      .filter(Boolean)
      .map((game) => [game.id, game]),
  );

  const comparableGameFields = [
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
  ];

  for (const [index, event] of events.entries()) {
    const nextGame = buildSeedGameRecord(event, index);
    const existingGame = existingGamesById.get(nextGame.id);

    try {
      const result = await upsertRecord({
        existing: existingGame,
        nextRecord: nextGame,
        createAction: () =>
          client.models.Game.create(nextGame, {
            authMode: "userPool",
          }),
        updateAction: () =>
          client.models.Game.update(nextGame, {
            authMode: "userPool",
          }),
        createMessage: `Unable to create ${nextGame.bowlName}.`,
        updateMessage: `Unable to update ${nextGame.bowlName}.`,
        comparedFields: comparableGameFields,
      });
      increment(result.action);
    } catch (error) {
      summary.failed += 1;
      summary.failures.push(`${nextGame.bowlName}: ${error.message}`);
    }
  }

  return summary;
};
