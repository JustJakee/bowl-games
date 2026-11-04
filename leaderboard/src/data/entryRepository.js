// Player lists use the owner index; private fields retain server authorization.
// Writes use guarded operations only.
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { selectCanonicalEntry } from "./canonicalEntry";

let dataClientOverride = null;
// The UI does not need Entry.owner's separate field resolver. Ownership below
// is local scope metadata from the authenticated owner's index, never write authority.
export const ENTRY_SELECTION = [
  "id",
  "seasonId",
  "userProfileId",
  "entryName",
  "entryNameKey",
  "contactEmail",
  "paymentStatus",
  "paidAt",
  "tieBreakerValue",
  "submittedAt",
  "lockedAt",
  "isDeleted",
  "createdAt",
  "updatedAt",
];
const PICK_ACTIVITY_SELECTION = [
  "id",
  "seasonId",
  "entryId",
  "createdAt",
  "updatedAt",
];
const getDataClient = () => dataClientOverride || configuredDataClient;
export const __setEntryRepositoryDataClientForTests = (client) => {
  dataClientOverride = client;
};
const ENTRY_MUTATION_ARGUMENTS = {
  createSeasonEntry: {
    seasonId: "ID!",
    contactEmail: "AWSEmail!",
    userProfileId: "ID",
  },
  updateSeasonEntry: {
    entryId: "ID!",
    contactEmail: "AWSEmail",
    tieBreakerValue: "Int",
    userProfileId: "ID",
    isDeleted: "Boolean",
  },
};
export const runSecureEntryMutation = async (client, operation, input) => {
  const args = ENTRY_MUTATION_ARGUMENTS[operation];
  if (!args) throw new Error("Unsupported guarded entry operation.");
  // The installed custom-operation generator ignores selectionSet for model
  // returns. Explicit GraphQL calls the same guarded operation with only the
  // intended fields, without silently adding owner or relationship selections.
  const definitions = Object.entries(args)
    .map(([key, type]) => `$${key}: ${type}`)
    .join(", ");
  const argumentsList = Object.keys(args)
    .map((key) => `${key}: $${key}`)
    .join(", ");
  const variables = Object.fromEntries(
    Object.keys(args)
      .filter((key) => input[key] !== undefined)
      .map((key) => [key, input[key]]),
  );
  try {
    const result = await client.graphql({
      query: `mutation GuardedEntry(${definitions}) { ${operation}(${argumentsList}) { ${ENTRY_SELECTION.join(" ")} } }`,
      variables,
      authMode: "userPool",
    });
    return { data: result.data?.[operation] ?? null, errors: result.errors };
  } catch (error) {
    if (error?.errors?.length)
      return { data: error.data?.[operation] ?? null, errors: error.errors };
    throw error;
  }
};

const checked = (result, message) => {
  if (result?.errors?.length) throw new Error(result.errors[0].message);
  if (!result) throw new Error(message);
  return result;
};
const normalizePlayerEntry = (entry, owner) =>
  entry
    ? {
        ...entry,
        owner,
        paymentStatus: entry.paymentStatus || "unpaid",
      }
    : null;
const requireOwner = (owner) => {
  if (!owner) throw new Error("You must be signed in to access your entry.");
};
const listAllPages = async (page, message) => {
  const items = [];
  let nextToken;
  do {
    const result = checked(await page(nextToken), message);
    if (!Array.isArray(result.data)) throw new Error(message);
    items.push(...result.data.filter(Boolean));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return items;
};

const readOwnedEntries = async ({ owner, seasonId, entryId }) => {
  requireOwner(owner);
  const rows = await listAllPages(
    (nextToken) =>
      getDataClient().models.Entry.entriesByOwner(
        { owner, ...(seasonId ? { seasonId: { eq: seasonId } } : {}) },
        {
          limit: 100,
          nextToken,
          authMode: "userPool",
          selectionSet: ENTRY_SELECTION,
          ...(entryId ? { filter: { id: { eq: entryId } } } : {}),
        },
      ),
    "Unable to load your entry.",
  );
  return rows
    .filter(
      (entry) =>
        entry.isDeleted !== true &&
        (!seasonId || entry.seasonId === seasonId) &&
        (!entryId || entry.id === entryId) &&
        (!entry.owner || entry.owner === owner),
    )
    .map((entry) => normalizePlayerEntry(entry, owner));
};

export const listEntriesForSeason = async ({ owner, seasonId }) => {
  if (!seasonId) throw new Error("The active season is unavailable.");
  return readOwnedEntries({ owner, seasonId });
};
export const getCanonicalEntryForUser = async ({ owner, seasonId }) => {
  requireOwner(owner);
  if (!seasonId) throw new Error("The active season is unavailable.");
  const [entries, picks] = await Promise.all([
    listEntriesForSeason({ owner, seasonId }),
    listAllPages(
      (nextToken) =>
        getDataClient().models.Pick.list({
          filter: { owner: { eq: owner }, seasonId: { eq: seasonId } },
          selectionSet: PICK_ACTIVITY_SELECTION,
          authMode: "userPool",
          limit: 100,
          nextToken,
        }),
      "Unable to load your entry's pick activity.",
    ),
  ]);
  return selectCanonicalEntry({ entries, picks, owner, seasonId });
};
export const getEntryById = async ({ entryId, owner, seasonId }) => {
  requireOwner(owner);
  if (!entryId) return null;
  // Read the base record after creation instead of waiting for a secondary
  // index to catch up. Protected fields below are authorized by AppSync.
  const result = checked(
    await getDataClient().models.Entry.get(
      { id: entryId },
      { selectionSet: ENTRY_SELECTION, authMode: "userPool" },
    ),
    "Unable to load your entry.",
  );
  const entry = result.data;
  if (
    !entry ||
    entry.isDeleted === true ||
    (entry.owner && entry.owner !== owner) ||
    (seasonId && entry.seasonId !== seasonId)
  )
    throw new Error("The requested entry was not found or is not yours.");
  return normalizePlayerEntry(entry, owner);
};
export const normalizeEmail = (email) => {
  const value = String(email || "").trim();
  if (!value)
    throw new Error(
      "A contact email is required before entries can be created.",
    );
  return value;
};
const mutationResult = (result, owner, message) => {
  checked(result, message);
  if (!result.data?.id) throw new Error(message);
  return normalizePlayerEntry(result.data, owner);
};
export const createEntry = async ({
  owner,
  seasonId,
  userProfileId,
  contactEmail,
}) => {
  requireOwner(owner);
  if (!seasonId) throw new Error("The active season is unavailable.");
  return mutationResult(
    await runSecureEntryMutation(getDataClient(), "createSeasonEntry", {
      seasonId,
      contactEmail: normalizeEmail(contactEmail),
      ...(userProfileId ? { userProfileId } : {}),
    }),
    owner,
    "Unable to create your entry.",
  );
};
export const createOrLoadEntry = async (input) =>
  (await getCanonicalEntryForUser(input)) || createEntry(input);
export const updateEntry = async ({
  entryId,
  owner,
  seasonId,
  contactEmail,
  tieBreakerValue,
  userProfileId,
  isDeleted,
}) => {
  const entry = await getEntryById({ entryId, owner, seasonId });
  const input = { entryId: entry.id };
  if (
    contactEmail !== undefined &&
    normalizeEmail(contactEmail) !== entry.contactEmail
  )
    input.contactEmail = normalizeEmail(contactEmail);
  if (
    tieBreakerValue !== undefined &&
    tieBreakerValue !== entry.tieBreakerValue
  )
    input.tieBreakerValue = tieBreakerValue;
  if (userProfileId && userProfileId !== entry.userProfileId)
    input.userProfileId = userProfileId;
  if (isDeleted === true) input.isDeleted = true;
  if (Object.keys(input).length === 1) return entry;
  return mutationResult(
    await runSecureEntryMutation(getDataClient(), "updateSeasonEntry", input),
    owner,
    "Unable to update your entry.",
  );
};
export const softDeleteEntry = async ({ entryId, owner, picksLocked }) => {
  if (picksLocked)
    throw new Error("Entries can no longer be deleted after picks lock.");
  return updateEntry({ entryId, owner, isDeleted: true });
};
