import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/secure-picks";
import { assertCanCreateEntry, assertCanSavePick, assertSeasonOpenForPlayer, buildVisibleSeasonPicks, oneEntryId } from "./rules.mjs";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient();
const authMode = "iam";

const checked = (result, label) => {
  if (result?.errors?.length)
    throw new Error(`${label}: ${result.errors.map((error) => error.message).join("; ")}`);
  if (!result) throw new Error(`${label}: no backend response.`);
  return result.data;
};

const allPages = async (page, label) => {
  const rows = [];
  let nextToken;
  do {
    const result = await page(nextToken);
    rows.push(...(checked(result, label) || []).filter(Boolean));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return rows;
};

const getSeason = async (seasonId) => checked(await client.models.Season.get(
  { id: seasonId },
  { authMode, selectionSet: ["id", "status", "isActive"] },
), "Load season");

const getConfig = async (seasonId) => {
  const rows = await allPages((nextToken) => client.models.SeasonConfig.seasonConfigBySeasonId(
    { seasonId },
    { authMode, nextToken, limit: 100, selectionSet: ["id", "seasonId", "picksOpenAt", "picksLockAt", "tieBreakerRequired", "maxEntriesPerUser"] },
  ), "Load season configuration");
  if (rows.length !== 1) throw new Error("The season pick configuration is missing or ambiguous.");
  return rows[0];
};

const getGames = (seasonId) => allPages((nextToken) => client.models.Game.gamesBySeason(
  { seasonId },
  { authMode, nextToken, limit: 100, selectionSet: ["id", "seasonId", "bowlName", "kickoffAt", "status", "teamAAbbr", "teamBAbbr"] },
), "Load season games");

const entrySelection = ["id", "seasonId", "owner", "isDeleted", "entryName", "entryNameKey", "contactEmail", "userProfileId", "tieBreakerValue", "paymentStatus", "paidAt", "submittedAt", "lockedAt", "createdAt", "updatedAt"];

const getEntry = async (entryId) => checked(await client.models.Entry.get(
  { id: entryId },
  { authMode, selectionSet: entrySelection },
), "Load entry");

const getEntryPicksForGame = (entryId, gameId) => allPages((nextToken) =>
  client.models.Pick.pickByEntryAndGame(
    { entryId },
    { authMode, nextToken, limit: 100, filter: { gameId: { eq: gameId } },
      selectionSet: ["id", "entryId", "seasonId", "gameId", "owner", "selectedTeam", "createdAt", "updatedAt"] },
  ), "Load current pick");

const pickSelection = ["id", "entryId", "seasonId", "gameId", "selectedTeam", "createdAt", "updatedAt"];
const pickId = (entryId, gameId) => `pick-${entryId}-${gameId}`.replace(/[^A-Za-z0-9_-]/g, "-");

const getSeasonBundle = async (seasonId) => {
  const [season, config, games] = await Promise.all([
    getSeason(seasonId), getConfig(seasonId), getGames(seasonId),
  ]);
  return { season, config, games };
};

const normalizeEntryName = (name) => {
  const value = String(name || "").trim();
  if (value.length < 3 || value.length > 60)
    throw new Error("Pick set names must be between 3 and 60 characters.");
  return value;
};

const verifyProfile = async (userProfileId, owner) => {
  if (!userProfileId) return;
  const profile = checked(await client.models.UserProfile.get(
    { id: userProfileId }, { authMode, selectionSet: ["id", "owner"] },
  ), "Load profile");
  if (!profile || profile.owner !== owner)
    throw new Error("The profile does not belong to this player.");
};

const ownedEntries = (owner, seasonId) => allPages((nextToken) => client.models.Entry.list({
  authMode, nextToken, limit: 100,
  filter: { owner: { eq: owner }, seasonId: { eq: seasonId } },
  selectionSet: ["id", "entryNameKey", "isDeleted"],
}), "Load player's entries");

const assertUniqueEntryName = (entries, name, excludedId) => {
  const key = name.toLowerCase();
  if (entries.some((entry) => entry.id !== excludedId && entry.isDeleted !== true && entry.entryNameKey === key))
    throw new Error("You already have an entry with that name for this season.");
};

const createEntry = async (event) => {
  const { seasonId, entryName, contactEmail, userProfileId } = event.arguments || {};
  const { season, config, games } = await getSeasonBundle(seasonId);
  const auth = assertSeasonOpenForPlayer({ identity: event.identity, season, config, games, now: Date.now() });
  const name = normalizeEntryName(entryName);
  const email = String(contactEmail || "").trim();
  if (!email) throw new Error("A contact email is required.");
  const [existing] = await Promise.all([ownedEntries(auth.owner, seasonId), verifyProfile(userProfileId, auth.owner)]);
  assertCanCreateEntry(existing);
  assertUniqueEntryName(existing, name);
  if (config.maxEntriesPerUser && existing.filter((entry) => entry.isDeleted !== true).length >= config.maxEntriesPerUser)
    throw new Error("The season entry limit has been reached.");
  assertSeasonOpenForPlayer({ identity: event.identity, season, config, games, now: Date.now() });
  return checked(await client.models.Entry.create({
    id: oneEntryId(seasonId, auth.owner, existing.length),
    seasonId, owner: auth.owner, userProfileId: userProfileId || undefined,
    entryName: name, entryNameKey: name.toLowerCase(), contactEmail: email,
    tieBreakerValue: null, isDeleted: false,
  }, { authMode, selectionSet: entrySelection }), "Create entry");
};

const updateEntry = async (event) => {
  const args = event.arguments || {};
  const entry = await getEntry(args.entryId);
  if (!entry) throw new Error("The requested entry was not found.");
  const { season, config, games } = await getSeasonBundle(entry.seasonId);
  const auth = assertSeasonOpenForPlayer({ identity: event.identity, entry, season, config, games, now: Date.now() });
  const changes = { id: entry.id };
  if (args.entryName !== undefined && args.entryName !== null) {
    const name = normalizeEntryName(args.entryName);
    const existing = await ownedEntries(auth.owner, entry.seasonId);
    assertUniqueEntryName(existing, name, entry.id);
    changes.entryName = name;
    changes.entryNameKey = name.toLowerCase();
  }
  if (args.contactEmail !== undefined && args.contactEmail !== null) {
    const email = String(args.contactEmail).trim();
    if (!email) throw new Error("A contact email is required.");
    changes.contactEmail = email;
  }
  if (args.tieBreakerValue !== undefined) {
    if (args.tieBreakerValue !== null && (!Number.isInteger(args.tieBreakerValue) || args.tieBreakerValue < 0))
      throw new Error("Tiebreaker must be a non-negative whole number.");
    changes.tieBreakerValue = args.tieBreakerValue;
  }
  if (args.userProfileId) {
    await verifyProfile(args.userProfileId, auth.owner);
    changes.userProfileId = args.userProfileId;
  }
  if (args.isDeleted === true) changes.isDeleted = true;
  if (Object.keys(changes).length === 1) return entry;
  assertSeasonOpenForPlayer({ identity: event.identity, entry, season, config, games, now: Date.now() });
  return checked(await client.models.Entry.update(changes, { authMode, selectionSet: entrySelection }), "Update entry");
};

const savePick = async (event) => {
  const { entryId, gameId, selectedTeam } = event.arguments || {};
  const entry = await getEntry(entryId);
  if (!entry) throw new Error("The requested entry was not found.");
  const { season, config, games } = await getSeasonBundle(entry.seasonId);
  const game = games.find((row) => row.id === gameId);
  const validation = assertCanSavePick({
    identity: event.identity, entry, season, config, games, game, selectedTeam, now: Date.now(),
  });
  const existing = await getEntryPicksForGame(entryId, gameId);
  if (existing.length > 1) throw new Error("Multiple saved picks exist for this entry and game.");
  if (existing[0] && (existing[0].owner !== validation.owner || existing[0].seasonId !== validation.seasonId))
    throw new Error("The saved pick has conflicting ownership.");
  // Check server time again immediately before the write so a slow read cannot pass the deadline.
  assertCanSavePick({
    identity: event.identity, entry, season, config, games, game, selectedTeam, now: Date.now(),
  });
  if (!existing[0] && !validation.selection) return null;
  const result = existing[0]
    ? await client.models.Pick.update(
      { id: existing[0].id, selectedTeam: validation.selection },
      { authMode, selectionSet: pickSelection },
    )
    : await client.models.Pick.create(
      { id: pickId(entryId, gameId), seasonId: validation.seasonId, entryId, gameId,
        owner: validation.owner, selectedTeam: validation.selection },
      { authMode, selectionSet: pickSelection },
    );
  return checked(result, "Save pick");
};

const visiblePicks = async (event) => {
  const seasonId = event.arguments?.seasonId;
  if (!event.identity?.sub) throw new Error("A signed-in player is required.");
  const [config, games, entries, picks] = await Promise.all([
    getConfig(seasonId),
    getGames(seasonId),
    allPages((nextToken) => client.models.Entry.list({
      authMode, nextToken, limit: 100, filter: { seasonId: { eq: seasonId } },
      selectionSet: ["id", "seasonId", "owner", "isDeleted", "tieBreakerValue"],
    }), "Load season entries"),
    allPages((nextToken) => client.models.Pick.picksBySeason(
      { seasonId },
      { authMode, nextToken, limit: 100,
        selectionSet: ["id", "seasonId", "entryId", "gameId", "owner", "selectedTeam", "createdAt", "updatedAt"] },
    ), "Load season picks"),
  ]);
  return buildVisibleSeasonPicks({ entries, picks, games, config, identity: event.identity, now: Date.now() });
};

export const handler = async (event) => {
  // Amplify's @function resolver sends the GraphQL field at the top level.
  if (event.fieldName === "saveSeasonPick") return savePick(event);
  if (event.fieldName === "visibleSeasonPicks") return visiblePicks(event);
  if (event.fieldName === "createSeasonEntry") return createEntry(event);
  if (event.fieldName === "updateSeasonEntry") return updateEntry(event);
  throw new Error("Unsupported pick operation.");
};
