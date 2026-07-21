import { dataClient as configuredDataClient } from "../auth/amplifyConfig";

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
  return sortEntries((result.data || []).filter(Boolean));
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
  const entry = result.data || null;
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
      id: `entry-${seasonId}-${crypto.randomUUID()}`,
      seasonId,
      owner,
      userProfileId: userProfileId || undefined,
      entryName: normalizedEntryName,
      entryNameKey: normalizedEntryName.toLowerCase(),
      contactEmail: normalizedEmail,
      paymentStatus: "unpaid",
      tieBreakerValue: null,
      isDeleted: false,
    },
    {
      selectionSet: ENTRY_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to create your entry.");
  return result.data;
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

  const nextValues = {
    id: existingEntry.id,
    userProfileId: userProfileId || existingEntry.userProfileId || undefined,
    entryName: nextEntryName,
    entryNameKey: nextEntryName.toLowerCase(),
    contactEmail: nextContactEmail,
    tieBreakerValue:
      tieBreakerValue === undefined
        ? existingEntry.tieBreakerValue
        : tieBreakerValue,
    isDeleted: false,
  };

  const client = getDataClient();
  const result = await client.models.Entry.update(nextValues, {
    selectionSet: ENTRY_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(result, "Unable to update your entry.");
  return result.data;
};
