import { createHash } from "node:crypto";

export const TEST_SEASON_ID = "test26";
export const TEST_SEASON_SLUG = "test26";
export const TEST_SEASON_CONFIG_ID = "season-config-test26";
export const TEST_SEASON_NAME = "2026 Test Season";
export const TIEBREAKER_BOWL_NAME =
  "College Football Playoff National Championship Presented by AT&T";
export const DEFAULT_PICKS_OPEN_HOURS = 24;
export const DEFAULT_GAME_INTERVAL_MINUTES = 15;
export const PLAN_TTL_MINUTES = 15;

export const GAME_MUTATION_FIELDS = [
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
];

const SEASON_FIELDS = [
  "year",
  "name",
  "slug",
  "status",
  "entryFeeCents",
  "isActive",
];

export const SEASON_CONFIG_MUTATION_FIELDS = [
  "id",
  "seasonId",
  "picksOpenAt",
  "picksLockAt",
  "maxEntriesPerUser",
  "tieBreakerLabel",
  "tieBreakerRequired",
  "scoringConfigJson",
];

const stableValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
};

export const stableStringify = (value) => JSON.stringify(stableValue(value));
export const hashValue = (value) =>
  createHash("sha256").update(stableStringify(value)).digest("hex");

export const serializeGameMutation = (record, deployedFieldNames) => {
  const deployedFields = new Set(deployedFieldNames);
  const missingFields = GAME_MUTATION_FIELDS.filter(
    (field) => !deployedFields.has(field),
  );
  if (missingFields.length) {
    throw new Error(
      `Refusing Game mutation: deployed model metadata is missing ${missingFields.join(", ")}.`,
    );
  }
  return Object.fromEntries(
    GAME_MUTATION_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(record, field),
    ).map((field) => [field, record[field]]),
  );
};

export const serializeSeasonConfigMutation = (record, deployedFields) => {
  const deployedFieldNames = new Set(Object.keys(deployedFields || {}));
  const missingFields = SEASON_CONFIG_MUTATION_FIELDS.filter(
    (field) => !deployedFieldNames.has(field),
  );
  if (missingFields.length) {
    throw new Error(
      `Refusing SeasonConfig mutation: deployed model metadata is missing ${missingFields.join(", ")}.`,
    );
  }
  if (deployedFields.scoringConfigJson?.type !== "AWSJSON") {
    throw new Error(
      "Refusing SeasonConfig mutation: scoringConfigJson is not deployed as AWSJSON.",
    );
  }

  const payload = Object.fromEntries(
    SEASON_CONFIG_MUTATION_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(record, field),
    ).map((field) => [field, record[field]]),
  );
  if (
    payload.scoringConfigJson !== null &&
    payload.scoringConfigJson !== undefined
  ) {
    if (typeof payload.scoringConfigJson === "string") {
      JSON.parse(payload.scoringConfigJson);
    } else {
      payload.scoringConfigJson = JSON.stringify(payload.scoringConfigJson);
    }
  }
  return payload;
};

export const prepareModelMutation = (model, record, modelDefinition) => {
  if (model === "Game") {
    return serializeGameMutation(
      record,
      Object.keys(modelDefinition?.fields || {}),
    );
  }
  if (model === "SeasonConfig") {
    return serializeSeasonConfigMutation(record, modelDefinition?.fields);
  }
  return record;
};

export const stableGameIdForSource = (sourceEventId) =>
  `game-${TEST_SEASON_ID}-${String(sourceEventId).trim()}`;

export const sourceEventIdFromStableGameId = (gameId) => {
  const prefix = `game-${TEST_SEASON_ID}-`;
  const value = String(gameId || "");
  return value.startsWith(prefix) && value.length > prefix.length
    ? value.slice(prefix.length)
    : null;
};

const valuesMatch = (left, right) => {
  const normalizeEmpty = (value) =>
    value === null || value === undefined || value === "" ? null : value;
  return (
    stableStringify(normalizeEmpty(left)) ===
    stableStringify(normalizeEmpty(right))
  );
};

const recordAction = (existing, proposed, fields) => {
  if (!existing) return "create";
  return fields.every((field) => valuesMatch(existing[field], proposed[field]))
    ? "skip"
    : "update";
};

const getCompetition = (event) => event?.competitions?.[0] || {};
const getCompetitor = (event, homeAway) =>
  getCompetition(event)?.competitors?.find(
    (competitor) => competitor?.homeAway === homeAway,
  ) || {};

const buildLocation = (venue) =>
  [venue?.fullName, venue?.address?.city, venue?.address?.state]
    .filter(Boolean)
    .join(" | ");

const buildTeamFields = (competitor, prefix, fallback) => ({
  [prefix]:
    competitor?.team?.displayName ||
    competitor?.team?.name ||
    competitor?.team?.abbreviation ||
    fallback,
  [`${prefix}DisplayName`]:
    competitor?.team?.displayName ||
    competitor?.team?.name ||
    competitor?.team?.abbreviation ||
    fallback,
  [`${prefix}Abbr`]:
    competitor?.team?.abbreviation ||
    competitor?.team?.shortDisplayName ||
    fallback.toUpperCase(),
  [`${prefix}Logo`]: competitor?.team?.logo || "",
  [`${prefix}Color`]: competitor?.team?.color || "",
  [`${prefix}AlternateColor`]: competitor?.team?.alternateColor || "",
  [`${prefix}Rank`]:
    competitor?.curatedRank?.current && competitor.curatedRank.current < 99
      ? competitor.curatedRank.current
      : null,
  [`${prefix}Score`]: null,
});

const toPositiveNumber = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed;
};

export const verifyTarget = ({ expected, actual }) => {
  const keys = [
    "accountId",
    "region",
    "amplifyAppId",
    "branch",
    "backendStackName",
    "appSyncApiId",
    "appSyncEndpointId",
    "appSyncEndpoint",
    "userPoolId",
    "userPoolClientId",
    "identityPoolId",
    "modelIntrospectionHash",
  ];
  const mismatches = keys.filter((key) => expected[key] !== actual[key]);
  if (mismatches.length) {
    throw new Error(
      `Refusing target: ${mismatches.map((key) => `${key}=${actual[key] || "missing"}`).join(", ")}`,
    );
  }
  return true;
};

export const buildSimulation = ({
  events,
  startAt,
  picksOpenHours = DEFAULT_PICKS_OPEN_HOURS,
  gameIntervalMinutes = DEFAULT_GAME_INTERVAL_MINUTES,
}) => {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime()))
    throw new Error("--start-at must be valid ISO-8601.");
  const openHours = toPositiveNumber(picksOpenHours, "--picks-open-hours");
  const intervalMinutes = toPositiveNumber(
    gameIntervalMinutes,
    "--game-interval-minutes",
  );
  const sourceEvents = (events || []).filter(Boolean);
  if (sourceEvents.length !== 54) {
    throw new Error(`Expected 54 mock events; found ${sourceEvents.length}.`);
  }
  const sourceIds = sourceEvents.map((event) => String(event?.id || "").trim());
  if (
    sourceIds.some((id) => !id) ||
    new Set(sourceIds).size !== sourceIds.length
  ) {
    throw new Error("Mock event IDs must be nonempty and unique.");
  }

  const firstKickoffMs = start.getTime() + openHours * 60 * 60 * 1000;
  const games = sourceEvents.map((event, index) => {
    const competition = getCompetition(event);
    const venue = competition?.venue || {};
    const away = getCompetitor(event, "away");
    const home = getCompetitor(event, "home");
    const bowlName =
      competition?.notes?.[0]?.headline ||
      competition?.name ||
      event?.name ||
      "Bowl Game";
    return {
      id: stableGameIdForSource(sourceIds[index]),
      seasonId: TEST_SEASON_ID,
      sourceEventId: sourceIds[index],
      gameNumber: index + 1,
      sortOrder: index + 1,
      bowlName,
      gameName: event?.name || bowlName,
      network:
        competition?.broadcasts?.[0]?.shortName ||
        competition?.broadcasts?.[0]?.names?.[0] ||
        "",
      status: "scheduled",
      statusDetail: "",
      ...buildTeamFields(away, "teamA", "Away"),
      ...buildTeamFields(home, "teamB", "Home"),
      kickoffAt: new Date(
        firstKickoffMs + index * intervalMinutes * 60 * 1000,
      ).toISOString(),
      neutralSite: Boolean(competition?.neutralSite),
      venueName: venue?.fullName || "",
      location: buildLocation(venue),
      winnerTeam: "",
    };
  });

  const earliestKickoffAt = games.map((game) => game.kickoffAt).sort()[0];
  const latestKickoffAt = games
    .map((game) => game.kickoffAt)
    .sort()
    .at(-1);
  const picksOpenAt = start.toISOString();
  const season = {
    id: TEST_SEASON_ID,
    year: 2026,
    name: TEST_SEASON_NAME,
    slug: TEST_SEASON_SLUG,
    status: "open",
    entryFeeCents: 0,
    isActive: true,
  };
  const seasonConfig = {
    id: TEST_SEASON_CONFIG_ID,
    seasonId: TEST_SEASON_ID,
    picksOpenAt,
    picksLockAt: earliestKickoffAt,
    maxEntriesPerUser: 10,
    tieBreakerLabel: "Total Points Scored",
    tieBreakerRequired: true,
    scoringConfigJson: JSON.stringify({
      tieBreakerBowlName: TIEBREAKER_BOWL_NAME,
    }),
  };

  if (seasonConfig.picksLockAt !== games[0].kickoffAt) {
    throw new Error(
      "Generated picks deadline does not equal the earliest kickoff.",
    );
  }
  for (let index = 1; index < games.length; index += 1) {
    if (games[index - 1].kickoffAt >= games[index].kickoffAt) {
      throw new Error(
        "Generated game kickoffs are not strictly chronological.",
      );
    }
  }

  return {
    options: {
      startAt: picksOpenAt,
      picksOpenHours: openHours,
      gameIntervalMinutes: intervalMinutes,
    },
    season,
    seasonConfig,
    games,
    summary: {
      picksOpenAt,
      picksLockAt: earliestKickoffAt,
      earliestGameId: games[0].id,
      earliestKickoffAt,
      latestGameId: games.at(-1).id,
      latestKickoffAt,
      totalDurationMinutes: (new Date(latestKickoffAt) - start) / 60000,
      deadlineMatchesEarliestKickoff:
        seasonConfig.picksLockAt === earliestKickoffAt,
    },
  };
};

const duplicateValues = (records, field) => {
  const counts = new Map();
  for (const record of records) {
    const value = String(record?.[field] || "").trim();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
};

export const buildRecordPlan = ({ simulation, state }) => {
  const conflicts = [];
  const seasonById = state.seasonById || null;
  const seasonsBySlug = state.seasonsBySlug || [];
  if (seasonsBySlug.length > 1)
    conflicts.push("Multiple Season records use slug test26.");
  if (seasonsBySlug.some((season) => season.id !== TEST_SEASON_ID)) {
    conflicts.push("Slug test26 belongs to a Season whose ID is not test26.");
  }
  if (seasonById && seasonsBySlug[0] && seasonById.id !== seasonsBySlug[0].id) {
    conflicts.push("Season ID and slug lookups resolve to different records.");
  }

  const configs = state.seasonConfigs || [];
  if (configs.length > 1)
    conflicts.push("Multiple SeasonConfig records reference test26.");
  const existingConfig = configs[0] || null;
  const proposedConfig = {
    ...simulation.seasonConfig,
    id: existingConfig?.id || TEST_SEASON_CONFIG_ID,
  };

  const existingGames = state.games || [];
  for (const id of duplicateValues(existingGames, "id")) {
    conflicts.push(`Duplicate existing Game ID: ${id}.`);
  }
  for (const sourceId of duplicateValues(existingGames, "sourceEventId")) {
    conflicts.push(`Duplicate existing Game sourceEventId: ${sourceId}.`);
  }
  const gamesById = new Map(existingGames.map((game) => [game.id, game]));
  const gamesBySource = new Map();
  for (const game of existingGames) {
    const persistedSource = String(game.sourceEventId || "").trim() || null;
    const stableSource = sourceEventIdFromStableGameId(game.id);
    if (persistedSource && stableSource && persistedSource !== stableSource) {
      conflicts.push(
        `Game ${game.id} has a conflicting stable source identity.`,
      );
    }
    for (const sourceId of new Set(
      [persistedSource, stableSource].filter(Boolean),
    )) {
      const previous = gamesBySource.get(sourceId);
      if (previous && previous.id !== game.id) {
        conflicts.push(`Duplicate existing Game source identity: ${sourceId}.`);
      } else {
        gamesBySource.set(sourceId, game);
      }
    }
  }
  for (const proposed of simulation.games) {
    const expectedId = stableGameIdForSource(proposed.sourceEventId);
    if (proposed.id !== expectedId) {
      conflicts.push(
        `Game ${proposed.id} does not match stable source identity ${proposed.sourceEventId}.`,
      );
    }
    const idMatch = gamesById.get(proposed.id);
    const sourceMatch = gamesBySource.get(proposed.sourceEventId);
    if (
      idMatch &&
      idMatch.sourceEventId &&
      idMatch.sourceEventId !== proposed.sourceEventId
    ) {
      conflicts.push(`Game ${proposed.id} has a conflicting sourceEventId.`);
    }
    if (sourceMatch && sourceMatch.id !== proposed.id) {
      conflicts.push(
        `Source event ${proposed.sourceEventId} belongs to ${sourceMatch.id}.`,
      );
    }
  }

  const seasonAction = recordAction(
    seasonById,
    simulation.season,
    SEASON_FIELDS,
  );
  const configAction = recordAction(
    existingConfig,
    proposedConfig,
    SEASON_CONFIG_MUTATION_FIELDS,
  );
  const gameItems = simulation.games.map((proposed) => ({
    id: proposed.id,
    action: recordAction(
      gamesById.get(proposed.id),
      proposed,
      GAME_MUTATION_FIELDS,
    ),
    proposed,
  }));
  const entries = state.entries || [];
  const picks = state.picks || [];
  const intendedMutations =
    Number(seasonAction !== "skip") +
    Number(configAction !== "skip") +
    gameItems.filter((item) => item.action !== "skip").length;
  if ((entries.length > 0 || picks.length > 0) && intendedMutations > 0) {
    conflicts.push(
      `Existing test26 data blocks schedule replacement (${entries.length} entries, ${picks.length} picks).`,
    );
  }
  const proposedIds = new Set(simulation.games.map((game) => game.id));

  return {
    season: { action: seasonAction, proposed: simulation.season },
    seasonConfig: { action: configAction, proposed: proposedConfig },
    games: gameItems,
    counts: {
      season: {
        create: Number(seasonAction === "create"),
        update: Number(seasonAction === "update"),
        skip: Number(seasonAction === "skip"),
        conflict: conflicts.filter((item) => item.includes("Season ")).length,
      },
      seasonConfig: {
        create: Number(configAction === "create"),
        update: Number(configAction === "update"),
        skip: Number(configAction === "skip"),
        conflict: conflicts.filter((item) => item.includes("SeasonConfig"))
          .length,
      },
      games: {
        create: gameItems.filter((item) => item.action === "create").length,
        update: gameItems.filter((item) => item.action === "update").length,
        skip: gameItems.filter((item) => item.action === "skip").length,
        conflict: conflicts.filter(
          (item) => item.includes("Game") || item.includes("Source event"),
        ).length,
      },
      existingEntries: entries.length,
      existingPicks: picks.length,
      intendedMutations,
      unmanagedGames: existingGames.filter((game) => !proposedIds.has(game.id))
        .length,
    },
    conflicts: [...new Set(conflicts)],
  };
};

export const createPlan = ({ target, simulation, state, now = new Date() }) => {
  const recordPlan = buildRecordPlan({ simulation, state });
  const body = {
    version: 1,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PLAN_TTL_MINUTES * 60000).toISOString(),
    target,
    simulation: { options: simulation.options, summary: simulation.summary },
    records: recordPlan,
    stateHash: hashValue(state),
  };
  const hash = hashValue(body);
  return {
    ...body,
    hash,
    confirmation: `${target.appSyncApiId}:${hash.slice(0, 12)}`,
  };
};

export const createDryRunPlan = async ({ gateway, target, simulation, now }) =>
  createPlan({ target, simulation, state: await gateway.readState(), now });

export const validatePlanArtifact = ({
  plan,
  confirmation,
  now = new Date(),
}) => {
  if (!plan || plan.version !== 1 || !plan.hash)
    throw new Error("A valid dry-run plan is required.");
  const { hash, confirmation: storedConfirmation, ...body } = plan;
  if (hashValue(body) !== hash)
    throw new Error("Dry-run plan hash is invalid.");
  if (new Date(plan.expiresAt).getTime() <= now.getTime())
    throw new Error("Dry-run plan has expired.");
  const expected = `${plan.target.appSyncApiId}:${hash.slice(0, 12)}`;
  if (storedConfirmation !== expected || confirmation !== expected) {
    throw new Error("Apply confirmation does not match the dry-run plan.");
  }
  if (plan.records.conflicts.length)
    throw new Error("Dry-run plan contains blocking conflicts.");
  return true;
};

export const applyPlan = async ({
  gateway,
  plan,
  confirmation,
  currentState,
  now,
}) => {
  validatePlanArtifact({ plan, confirmation, now });
  if (hashValue(currentState) !== plan.stateHash) {
    throw new Error(
      "Backend state changed after dry run; generate a new plan.",
    );
  }
  const results = { created: 0, updated: 0, skipped: 0 };
  const execute = async (model, item) => {
    if (item.action === "skip") {
      results.skipped += 1;
      return;
    }
    await gateway[item.action](model, item.proposed);
    results[`${item.action}d`] += 1;
  };
  await execute("Season", plan.records.season);
  await execute("SeasonConfig", plan.records.seasonConfig);
  for (const game of plan.records.games) await execute("Game", game);
  return results;
};
