// DATA — ENTRIES — AMPLIFY DATA
// Entry operations recheck ownership client-side while Amplify enforces the authoritative owner rules.
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";

let dataClientOverride = null;

export const ENTRY_SELECTION = [
  "id",
  "seasonId",
  "owner",
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

const getDataClient = () => {
  return dataClientOverride || configuredDataClient;
};

export const __setEntryRepositoryDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
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

const normalizePlayerEntry = (entry) =>
  entry
    ? {
        ...entry,
        paymentStatus: entry.paymentStatus || "unpaid",
      }
    : entry;

const sortEntries = (entries = []) =>
  (entries || []).slice().sort((left, right) => {
    const leftUpdated = new Date(
      left?.updatedAt || left?.createdAt || 0,
    ).getTime();
    const rightUpdated = new Date(
      right?.updatedAt || right?.createdAt || 0,
    ).getTime();
    return rightUpdated - leftUpdated;
  });

export const normalizeEntryName = (entryName) => {
  const trimmed = String(entryName || "").trim();

  if (trimmed.length < 3 || trimmed.length > 60) {
    throw new Error("Entry names must be between 3 and 60 characters.");
  }

  return trimmed;
};

export const normalizeEntryNameKey = (entryName) =>
  normalizeEntryName(entryName).toLowerCase();

export const normalizeEmail = (contactEmail) => {
  const trimmed = String(contactEmail || "").trim();

  if (!trimmed) {
    throw new Error(
      "A contact email is required before entries can be created.",
    );
  }

  return trimmed;
};

const ensureOwnership = (entry, owner) => {
  if (!entry) {
    throw new Error("The requested entry was not found.");
  }

  if (owner && entry.owner && entry.owner !== owner) {
    throw new Error("You are not authorized to access that entry.");
  }
};

export const listEntriesForSeason = async ({ owner, seasonId }) => {
  if (!owner || !seasonId) {
    return [];
  }

  const client = getDataClient();
  const result = await client.models.Entry.list({
    filter: {
      owner: { eq: owner },
      seasonId: { eq: seasonId },
      isDeleted: { eq: false },
    },
    selectionSet: ENTRY_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(result, "Unable to load your entries.");
  return sortEntries(
    (result.data || []).filter(Boolean).map(normalizePlayerEntry),
  );
};

export const getEntryById = async ({ entryId, owner }) => {
  if (!entryId) {
    return null;
  }

  const client = getDataClient();
  const result = await client.models.Entry.get(
    { id: entryId },
    {
      selectionSet: ENTRY_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to load the requested entry.");
  const entry = normalizePlayerEntry(result.data || null);
  ensureOwnership(entry, owner);

  if (entry?.isDeleted) {
    return null;
  }

  return entry;
};

const assertUniqueEntryName = async ({
  owner,
  seasonId,
  entryName,
  excludeEntryId,
}) => {
  const existingEntries = await listEntriesForSeason({ owner, seasonId });
  const entryNameKey = normalizeEntryNameKey(entryName);
  const duplicate = existingEntries.find(
    (entry) =>
      entry.id !== excludeEntryId && entry.entryNameKey === entryNameKey,
  );

  if (duplicate) {
    throw new Error(
      "You already have an entry with that name for this season.",
    );
  }
};

export const createEntry = async ({
  owner,
  seasonId,
  userProfileId,
  entryName,
  contactEmail,
}) => {
  if (!owner) {
    throw new Error("You must be signed in before creating an entry.");
  }

  if (!seasonId) {
    throw new Error("The active season is unavailable.");
  }

  const normalizedEntryName = normalizeEntryName(entryName);
  const normalizedEmail = normalizeEmail(contactEmail);
  await assertUniqueEntryName({
    owner,
    seasonId,
    entryName: normalizedEntryName,
  });

  const client = getDataClient();
  const result = await client.models.Entry.create(
    {
      seasonId,
      owner,
      userProfileId: userProfileId || undefined,
      entryName: normalizedEntryName,
      entryNameKey: normalizedEntryName.toLowerCase(),
      contactEmail: normalizedEmail,
      tieBreakerValue: null,
      isDeleted: false,
    },
    {
      selectionSet: ENTRY_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to create your entry.");
  return normalizePlayerEntry(result.data);
};

export const updateEntry = async ({
  entryId,
  owner,
  seasonId,
  entryName,
  contactEmail,
  tieBreakerValue,
  userProfileId,
}) => {
  const existingEntry = await getEntryById({ entryId, owner });

  if (!existingEntry) {
    throw new Error("The requested entry was not found.");
  }

  const nextEntryName =
    entryName === undefined
      ? existingEntry.entryName
      : normalizeEntryName(entryName);
  const nextContactEmail =
    contactEmail === undefined
      ? existingEntry.contactEmail
      : normalizeEmail(contactEmail);

  if (nextEntryName !== existingEntry.entryName) {
    await assertUniqueEntryName({
      owner,
      seasonId: seasonId || existingEntry.seasonId,
      entryName: nextEntryName,
      excludeEntryId: existingEntry.id,
    });
  }

  // DATA - ENTRIES - MINIMAL MUTATIONS
  // Field authorization evaluates every supplied key, including null values. Only send fields
  // that this operation changes so unrelated protected fields are not re-written.
  const nextValues = { id: existingEntry.id };

  if (userProfileId && userProfileId !== existingEntry.userProfileId) {
    nextValues.userProfileId = userProfileId;
  }

  if (nextEntryName !== existingEntry.entryName) {
    nextValues.entryName = nextEntryName;
    nextValues.entryNameKey = nextEntryName.toLowerCase();
  }

  if (nextContactEmail !== existingEntry.contactEmail) {
    nextValues.contactEmail = nextContactEmail;
  }

  if (
    tieBreakerValue !== undefined &&
    tieBreakerValue !== existingEntry.tieBreakerValue
  ) {
    nextValues.tieBreakerValue = tieBreakerValue;
  }

  if (Object.keys(nextValues).length === 1) {
    return existingEntry;
  }

  const client = getDataClient();
  const result = await client.models.Entry.update(nextValues, {
    selectionSet: ENTRY_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(result, "Unable to update your entry.");
  return normalizePlayerEntry(result.data);
};

export const softDeleteEntry = async ({ entryId, owner, picksLocked }) => {
  if (picksLocked) {
    throw new Error("Entries can no longer be deleted after picks lock.");
  }

  const existingEntry = await getEntryById({ entryId, owner });

  if (!existingEntry) {
    throw new Error("The requested entry was not found.");
  }

  if (existingEntry.isDeleted) {
    return existingEntry;
  }

  const client = getDataClient();
  const result = await client.models.Entry.update(
    {
      id: existingEntry.id,
      isDeleted: true,
    },
    {
      selectionSet: ENTRY_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to delete your entry.");
  return normalizePlayerEntry(result.data);
};
