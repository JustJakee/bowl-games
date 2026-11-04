import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/secure-picks";
import { readEntryPickPages } from "../../../shared/entryPickQuery.mjs";
import {
  assertCanCreateEntry,
  assertCanSavePick,
  assertSeasonOpenForPlayer,
  buildAutomaticEntryName,
  buildVisibleSeasonPicks,
  oneEntryId,
} from "./rules.mjs";

const { resourceConfig, libraryOptions } =
  await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient();
const authMode = "iam";

const checked = (result, label) => {
  if (result?.errors?.length)
    throw new Error(
      `${label}: ${result.errors.map((error) => error.message).join("; ")}`,
    );
  if (!result) throw new Error(`${label}: no backend response.`);
  return result.data;
};

const allPages = async (page, label) => {
  const rows = [];
  let nextToken;
  do {
    const result = await page(nextToken);
    const data = checked(result, label);
    if (!Array.isArray(data))
      throw new Error(`${label}: invalid list response.`);
    rows.push(...data.filter(Boolean));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return rows;
};

const getSeason = async (seasonId) =>
  checked(
    await client.models.Season.get(
      { id: seasonId },
      { authMode, selectionSet: ["id", "year", "status", "isActive"] },
    ),
    "Load season",
  );

const getConfig = async (seasonId) => {
  const rows = await allPages(
    (nextToken) =>
      client.models.SeasonConfig.seasonConfigBySeasonId(
        { seasonId },
        {
          authMode,
          nextToken,
          limit: 100,
          selectionSet: [
            "id",
            "seasonId",
            "picksOpenAt",
            "picksLockAt",
            "tieBreakerRequired",
            "maxEntriesPerUser",
          ],
        },
      ),
    "Load season configuration",
  );
  if (rows.length !== 1)
    throw new Error("The season pick configuration is missing or ambiguous.");
  return rows[0];
};

const getGames = (seasonId) =>
  allPages(
    (nextToken) =>
      client.models.Game.gamesBySeason(
        { seasonId },
        {
          authMode,
          nextToken,
          limit: 100,
          selectionSet: [
            "id",
            "seasonId",
            "bowlName",
            "kickoffAt",
            "status",
            "teamAAbbr",
            "teamBAbbr",
          ],
        },
      ),
    "Load season games",
  );

const entrySelection = [
  "id",
  "seasonId",
  "owner",
  "isDeleted",
  "entryName",
  "entryNameKey",
  "contactEmail",
  "userProfileId",
  "tieBreakerValue",
  "paymentStatus",
  "paidAt",
  "submittedAt",
  "lockedAt",
  "createdAt",
  "updatedAt",
];

const getEntry = async (entryId) =>
  checked(
    await client.models.Entry.get(
      { id: entryId },
      { authMode, selectionSet: entrySelection },
    ),
    "Load entry",
  );

const getEntryPicksForGame = (entryId, gameId) =>
  readEntryPickPages(client, {
    entryId,
    gameId,
    authMode,
    label: "Load current pick",
  });

const pickRecordSelection = [
  "id",
  "entryId",
  "seasonId",
  "gameId",
  "owner",
  "selectedTeam",
  "createdAt",
  "updatedAt",
];
const getPickById = async (id) =>
  checked(
    await client.models.Pick.get(
      { id },
      { authMode, selectionSet: pickRecordSelection },
    ),
    "Load current pick by ID",
  );

const pickSelection = [
  "id",
  "entryId",
  "seasonId",
  "gameId",
  "selectedTeam",
  "createdAt",
  "updatedAt",
];
const pickId = (entryId, gameId) =>
  `pick-${entryId}-${gameId}`.replace(/[^A-Za-z0-9_-]/g, "-");
const isConditionalConflict = (result) =>
  result?.errors?.some((error) =>
    /ConditionalCheckFailed|conditional request failed/i.test(
      `${error.errorType || ""} ${error.message || ""}`,
    ),
  );

const clearUnseenPick = async ({
  id,
  entryId,
  gameId,
  owner,
  seasonId,
  beforeWrite,
}) => {
  // Both generated reads can be stale. DynamoDB evaluates this update's
  // existence and ownership conditions atomically against the stored item.
  const query = `mutation ClearUnseenPick($input: UpdatePickInput!, $condition: ModelPickConditionInput) {
    updatePick(input: $input, condition: $condition) { ${pickSelection.join(" ")} }
  }`;
  const variables = {
    input: { id, selectedTeam: "" },
    condition: {
      owner: { eq: owner },
      entryId: { eq: entryId },
      gameId: { eq: gameId },
      seasonId: { eq: seasonId },
    },
  };
  let response;
  try {
    response = await client.graphql({ query, variables, authMode });
  } catch (error) {
    if (!error?.errors?.length) throw error;
    response = { data: error.data, errors: error.errors };
  }
  if (isConditionalConflict(response)) {
    const conflicting = await getPickById(id);
    if (conflicting)
      throw new Error(
        "The saved pick has conflicting ownership or target. Retry safely.",
      );
    // A failed condition plus an eventual read cannot prove absence. Persist
    // an empty record under the create condition; a hidden conflicting item
    // must fail rather than producing a false account confirmation.
    beforeWrite();
    return checked(
      await client.models.Pick.create(
        { id, entryId, gameId, owner, seasonId, selectedTeam: "" },
        { authMode, selectionSet: pickSelection },
      ),
      "Clear pick",
    );
  }
  checked(response, "Clear pick");
  return response.data?.updatePick;
};

const getSeasonBundle = async (seasonId) => {
  const [season, config, games] = await Promise.all([
    getSeason(seasonId),
    getConfig(seasonId),
    getGames(seasonId),
  ]);
  return { season, config, games };
};

const verifyProfile = async (userProfileId, owner) => {
  if (!userProfileId) return;
  const profile = checked(
    await client.models.UserProfile.get(
      { id: userProfileId },
      { authMode, selectionSet: ["id", "owner"] },
    ),
    "Load profile",
  );
  if (!profile || profile.owner !== owner)
    throw new Error("The profile does not belong to this player.");
};

const getOwnedProfile = async (owner, requestedId) => {
  const profiles = await allPages(
    (nextToken) =>
      client.models.UserProfile.userProfileByOwner(
        { owner },
        {
          authMode,
          nextToken,
          limit: 100,
          selectionSet: ["id", "owner", "username", "usernameKey"],
        },
      ),
    "Load player's profile",
  );
  if (profiles.length !== 1 || profiles[0].owner !== owner)
    throw new Error("Your player profile is missing or ambiguous.");
  if (requestedId && requestedId !== profiles[0].id)
    throw new Error("The profile does not belong to this player.");
  return profiles[0];
};

const ownedEntries = (owner, seasonId) =>
  allPages(
    (nextToken) =>
      client.models.Entry.list({
        authMode,
        nextToken,
        limit: 100,
        filter: { owner: { eq: owner }, seasonId: { eq: seasonId } },
        selectionSet: ["id", "entryNameKey", "isDeleted"],
      }),
    "Load player's entries",
  );

const createEntry = async (event) => {
  const { seasonId, contactEmail, userProfileId } = event.arguments || {};
  const { season, config, games } = await getSeasonBundle(seasonId);
  const auth = assertSeasonOpenForPlayer({
    identity: event.identity,
    season,
    config,
    games,
    now: Date.now(),
  });
  const email = String(contactEmail || "").trim();
  if (!email) throw new Error("A contact email is required.");
  const existing = await ownedEntries(auth.owner, seasonId);
  const active = existing.filter((entry) => entry.isDeleted !== true);
  if (active.length === 1) {
    const entry = await getEntry(active[0].id);
    if (!entry)
      throw new Error("Unable to load your existing entry. Retry safely.");
    assertSeasonOpenForPlayer({
      identity: event.identity,
      entry,
      season,
      config,
      games,
      now: Date.now(),
    });
    return entry;
  }
  assertCanCreateEntry(existing);
  const profile = await getOwnedProfile(auth.owner, userProfileId);
  const name = buildAutomaticEntryName(profile, season);
  if (
    config.maxEntriesPerUser &&
    existing.filter((entry) => entry.isDeleted !== true).length >=
      config.maxEntriesPerUser
  )
    throw new Error("The season entry limit has been reached.");
  assertSeasonOpenForPlayer({
    identity: event.identity,
    season,
    config,
    games,
    now: Date.now(),
  });
  const id = oneEntryId(seasonId, auth.owner, existing.length);
  const result = await client.models.Entry.create(
    {
      id,
      seasonId,
      owner: auth.owner,
      userProfileId: profile.id,
      entryName: name,
      entryNameKey: name.toLowerCase(),
      contactEmail: email,
      tieBreakerValue: null,
      isDeleted: false,
    },
    { authMode, selectionSet: ["id"] },
  );
  if (
    result?.errors?.some((error) =>
      /ConditionalCheckFailed|conditional request failed|already exists/i.test(
        `${error.errorType || ""} ${error.message}`,
      ),
    )
  ) {
    const racedEntry = await getEntry(id);
    if (
      racedEntry &&
      racedEntry.owner === auth.owner &&
      racedEntry.seasonId === seasonId &&
      racedEntry.isDeleted !== true
    )
      return racedEntry;
  }
  checked(result, "Create entry");
  // Generated model mutation responses redact read-only owner fields. Re-read
  // the stored record so custom Entry field resolvers see the persisted owner.
  const stored = await getEntry(id);
  if (!stored || stored.owner !== auth.owner || stored.seasonId !== seasonId)
    throw new Error(
      "Unable to confirm the created entry. Retry to load it safely.",
    );
  return stored;
};

const updateEntry = async (event) => {
  const args = event.arguments || {};
  const entry = await getEntry(args.entryId);
  if (!entry) throw new Error("The requested entry was not found.");
  const { season, config, games } = await getSeasonBundle(entry.seasonId);
  const auth = assertSeasonOpenForPlayer({
    identity: event.identity,
    entry,
    season,
    config,
    games,
    now: Date.now(),
  });
  const changes = { id: entry.id };
  // Legacy name arguments are ignored; player updates never rename an entry.
  if (args.contactEmail !== undefined && args.contactEmail !== null) {
    const email = String(args.contactEmail).trim();
    if (!email) throw new Error("A contact email is required.");
    changes.contactEmail = email;
  }
  if (args.tieBreakerValue !== undefined) {
    if (
      args.tieBreakerValue !== null &&
      (!Number.isInteger(args.tieBreakerValue) || args.tieBreakerValue < 0)
    )
      throw new Error("Tiebreaker must be a non-negative whole number.");
    changes.tieBreakerValue = args.tieBreakerValue;
  }
  if (args.userProfileId) {
    await verifyProfile(args.userProfileId, auth.owner);
    changes.userProfileId = args.userProfileId;
  }
  if (args.isDeleted === true) changes.isDeleted = true;
  if (Object.keys(changes).length === 1) return entry;
  assertSeasonOpenForPlayer({
    identity: event.identity,
    entry,
    season,
    config,
    games,
    now: Date.now(),
  });
  checked(
    await client.models.Entry.update(changes, {
      authMode,
      selectionSet: ["id"],
    }),
    "Update entry",
  );
  return getEntry(entry.id);
};

const savePick = async (event) => {
  const { entryId, gameId, selectedTeam } = event.arguments || {};
  const entry = await getEntry(entryId);
  if (!entry) throw new Error("The requested entry was not found.");
  const { season, config, games } = await getSeasonBundle(entry.seasonId);
  const game = games.find((row) => row.id === gameId);
  const validation = assertCanSavePick({
    identity: event.identity,
    entry,
    season,
    config,
    games,
    game,
    selectedTeam,
    now: Date.now(),
  });
  const indexed = await getEntryPicksForGame(entryId, gameId);
  // The entry/game index is eventually consistent. The stable primary key also
  // catches a recent create that has not appeared in that index yet.
  const existing = indexed.length
    ? indexed
    : [await getPickById(pickId(entryId, gameId))].filter(Boolean);
  if (existing.length > 1)
    throw new Error("Multiple saved picks exist for this entry and game.");
  if (
    existing[0] &&
    (existing[0].owner !== validation.owner ||
      existing[0].seasonId !== validation.seasonId ||
      existing[0].entryId !== entryId ||
      existing[0].gameId !== gameId)
  )
    throw new Error("The saved pick has conflicting ownership.");
  // Check server time again immediately before the write so a slow read cannot pass the deadline.
  assertCanSavePick({
    identity: event.identity,
    entry,
    season,
    config,
    games,
    game,
    selectedTeam,
    now: Date.now(),
  });
  // If both eventual reads miss, a conditional update confirms a clear or
  // confirms that the stable ID is absent. Never acknowledge only the reads.
  if (!existing[0] && !validation.selection) {
    const cleared = await clearUnseenPick({
      id: pickId(entryId, gameId),
      entryId,
      gameId,
      owner: validation.owner,
      seasonId: validation.seasonId,
      beforeWrite: () =>
        assertCanSavePick({
          identity: event.identity,
          entry,
          season,
          config,
          games,
          game,
          selectedTeam,
          now: Date.now(),
        }),
    });
    if (
      !cleared ||
      cleared.entryId !== entryId ||
      cleared.gameId !== gameId ||
      cleared.seasonId !== validation.seasonId ||
      cleared.selectedTeam !== ""
    )
      throw new Error(
        "Clear pick: the backend did not confirm the empty selection.",
      );
    return cleared;
  }
  let result = existing[0]
    ? await client.models.Pick.update(
        { id: existing[0].id, selectedTeam: validation.selection },
        { authMode, selectionSet: pickSelection },
      )
    : await client.models.Pick.create(
        {
          id: pickId(entryId, gameId),
          seasonId: validation.seasonId,
          entryId,
          gameId,
          owner: validation.owner,
          selectedTeam: validation.selection,
        },
        { authMode, selectionSet: pickSelection },
      );
  if (!existing[0] && isConditionalConflict(result)) {
    // A concurrent create won the primary-key condition. Verify the stored
    // owner and target before updating; never relax the create condition.
    const racedPick = await getPickById(pickId(entryId, gameId));
    if (!racedPick)
      throw new Error(
        "The saved pick is still becoming visible. Retry this selection safely.",
      );
    if (
      racedPick.owner !== validation.owner ||
      racedPick.seasonId !== validation.seasonId ||
      racedPick.entryId !== entryId ||
      racedPick.gameId !== gameId
    )
      throw new Error("The saved pick has conflicting ownership.");
    assertCanSavePick({
      identity: event.identity,
      entry,
      season,
      config,
      games,
      game,
      selectedTeam,
      now: Date.now(),
    });
    result = await client.models.Pick.update(
      { id: racedPick.id, selectedTeam: validation.selection },
      { authMode, selectionSet: pickSelection },
    );
  }
  const saved = checked(result, "Save pick");
  if (
    !saved ||
    saved.entryId !== entryId ||
    saved.gameId !== gameId ||
    saved.seasonId !== validation.seasonId ||
    saved.selectedTeam !== validation.selection
  )
    throw new Error(
      "Save pick: the backend did not confirm the requested selection.",
    );
  return saved;
};

const visiblePicks = async (event) => {
  const seasonId = event.arguments?.seasonId;
  if (!event.identity?.sub) throw new Error("A signed-in player is required.");
  const [config, games, entries, picks] = await Promise.all([
    getConfig(seasonId),
    getGames(seasonId),
    allPages(
      (nextToken) =>
        client.models.Entry.list({
          authMode,
          nextToken,
          limit: 100,
          filter: { seasonId: { eq: seasonId } },
          selectionSet: [
            "id",
            "seasonId",
            "owner",
            "isDeleted",
            "tieBreakerValue",
          ],
        }),
      "Load season entries",
    ),
    allPages(
      (nextToken) =>
        client.models.Pick.picksBySeason(
          { seasonId },
          {
            authMode,
            nextToken,
            limit: 100,
            selectionSet: [
              "id",
              "seasonId",
              "entryId",
              "gameId",
              "owner",
              "selectedTeam",
              "createdAt",
              "updatedAt",
            ],
          },
        ),
      "Load season picks",
    ),
  ]);
  return buildVisibleSeasonPicks({
    entries,
    picks,
    games,
    config,
    identity: event.identity,
    now: Date.now(),
  });
};

export const handler = async (event) => {
  // Amplify's @function resolver sends the GraphQL field at the top level.
  if (event.fieldName === "saveSeasonPick") return savePick(event);
  if (event.fieldName === "visibleSeasonPicks") return visiblePicks(event);
  if (event.fieldName === "createSeasonEntry") return createEntry(event);
  if (event.fieldName === "updateSeasonEntry") return updateEntry(event);
  throw new Error("Unsupported pick operation.");
};
