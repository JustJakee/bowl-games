import { generateClient } from "aws-amplify/api";

export const CURRENT_SEASON_YEAR = 2026;
export const CURRENT_SEASON_ID = `season-${CURRENT_SEASON_YEAR}`;
export const PICK_SET_STATUS = {
  DRAFT: "DRAFT",
  COMPLETE: "COMPLETE",
};

const ENTRY_SELECTION = [
  "id",
  "owner",
  "userProfileId",
  "seasonId",
  "entryName",
  "entryNameKey",
  "contactEmail",
  "paymentStatus",
  "tieBreakerValue",
  "submittedAt",
  "lockedAt",
  "isDeleted",
  "createdAt",
  "updatedAt",
];

const PICK_SELECTION = [
  "id",
  "entryId",
  "seasonId",
  "gameId",
  "owner",
  "selectedTeam",
  "createdAt",
  "updatedAt",
];

let dataClient;

const getDataClient = () => {
  if (!dataClient) {
    dataClient = generateClient();
  }

  return dataClient;
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

const sanitizeIdPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const buildEntryId = (owner, seasonId) =>
  `entry-${sanitizeIdPart(seasonId)}-${sanitizeIdPart(owner)}`;

const buildPickId = (entryId, gameId) =>
  `pick-${sanitizeIdPart(entryId)}-${sanitizeIdPart(gameId)}`;

const normalizeEntryName = (entryName) => {
  const trimmed = String(entryName || "").trim();
  return trimmed || "My Picks";
};

const normalizeEmail = (contactEmail) => {
  const trimmed = String(contactEmail || "").trim();
  if (!trimmed) {
    throw new Error("A contact email is required before picks can be saved.");
  }

  return trimmed;
};

const normalizeTieBreakerValue = (tieBreakerValue) => {
  if (
    tieBreakerValue === "" ||
    tieBreakerValue === null ||
    tieBreakerValue === undefined
  ) {
    return null;
  }

  const parsed = Number(tieBreakerValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSelectionMap = (picks = []) =>
  picks.reduce((accumulator, pick) => {
    if (pick?.gameId && pick?.selectedTeam) {
      accumulator[pick.gameId] = pick.selectedTeam;
    }
    return accumulator;
  }, {});

export const calculatePickSetStatus = ({
  requiredGameIds = [],
  selectionsByGameId = {},
  tieBreakerRequired = false,
  tieBreakerValue = null,
}) => {
  const gameIds = requiredGameIds.filter(Boolean);

  if (gameIds.length === 0) {
    return PICK_SET_STATUS.DRAFT;
  }

  const hasAllSelections = gameIds.every((gameId) =>
    Boolean(selectionsByGameId?.[gameId])
  );
  const hasTieBreaker =
    !tieBreakerRequired ||
    tieBreakerValue === 0 ||
    Boolean(String(tieBreakerValue ?? "").trim());
  const isComplete = hasAllSelections && hasTieBreaker;
  return isComplete ? PICK_SET_STATUS.COMPLETE : PICK_SET_STATUS.DRAFT;
};

export const getCurrentSeasonEntry = async ({
  owner,
  seasonId = CURRENT_SEASON_ID,
}) => {
  if (!owner) {
    return null;
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

  throwIfGraphQLError(result, "Unable to load your saved picks entry.");

  const entries = (result.data || []).filter(Boolean);
  if (entries.length === 0) {
    return null;
  }

  return entries.sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  })[0];
};

export const getOrCreateCurrentSeasonEntry = async ({
  owner,
  seasonId = CURRENT_SEASON_ID,
  userProfileId,
  entryName,
  contactEmail,
  tieBreakerValue,
}) => {
  if (!owner) {
    throw new Error("You must be signed in before picks can be saved.");
  }

  const client = getDataClient();
  const normalizedEntryName = normalizeEntryName(entryName);
  const normalizedEmail = normalizeEmail(contactEmail);
  const normalizedTieBreakerValue = normalizeTieBreakerValue(tieBreakerValue);
  const existingEntry = await getCurrentSeasonEntry({ owner, seasonId });

  if (!existingEntry) {
    const createResult = await client.models.Entry.create(
      {
        id: buildEntryId(owner, seasonId),
        seasonId,
        owner,
        userProfileId: userProfileId || undefined,
        entryName: normalizedEntryName,
        entryNameKey: normalizedEntryName.toLowerCase(),
        contactEmail: normalizedEmail,
        paymentStatus: "unpaid",
        tieBreakerValue: normalizedTieBreakerValue,
        isDeleted: false,
      },
      {
        selectionSet: ENTRY_SELECTION,
        authMode: "userPool",
      }
    );

    throwIfGraphQLError(createResult, "Unable to create your picks entry.");
    return createResult.data;
  }

  const nextValues = {
    id: existingEntry.id,
    userProfileId: userProfileId || existingEntry.userProfileId || undefined,
    entryName: normalizedEntryName,
    entryNameKey: normalizedEntryName.toLowerCase(),
    contactEmail: normalizedEmail,
    tieBreakerValue: normalizedTieBreakerValue,
    isDeleted: false,
  };

  const needsUpdate =
    existingEntry.entryName !== nextValues.entryName ||
    existingEntry.entryNameKey !== nextValues.entryNameKey ||
    existingEntry.contactEmail !== nextValues.contactEmail ||
    existingEntry.userProfileId !== nextValues.userProfileId ||
    (existingEntry.tieBreakerValue ?? null) !== nextValues.tieBreakerValue ||
    existingEntry.isDeleted !== false;

  if (!needsUpdate) {
    return existingEntry;
  }

  const updateResult = await client.models.Entry.update(nextValues, {
    selectionSet: ENTRY_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(updateResult, "Unable to update your picks entry.");
  return updateResult.data;
};

export const loadSavedPicks = async ({
  entryId,
  seasonId = CURRENT_SEASON_ID,
  currentGameIds = [],
}) => {
  if (!entryId) {
    return {
      picks: [],
      picksByGameId: {},
      selectionsByGameId: {},
      stalePicks: [],
    };
  }

  const client = getDataClient();
  const result = await client.models.Pick.list({
    filter: {
      entryId: { eq: entryId },
      seasonId: { eq: seasonId },
    },
    selectionSet: PICK_SELECTION,
    authMode: "userPool",
  });

  throwIfGraphQLError(result, "Unable to load your saved picks.");

  const picks = (result.data || []).filter(Boolean);
  const currentIdSet = new Set(currentGameIds.filter(Boolean));
  const stalePicks = picks.filter(
    (pick) => currentIdSet.size > 0 && !currentIdSet.has(pick.gameId)
  );
  const activePicks = picks.filter(
    (pick) => currentIdSet.size === 0 || currentIdSet.has(pick.gameId)
  );

  return {
    picks: activePicks,
    picksByGameId: activePicks.reduce((accumulator, pick) => {
      accumulator[pick.gameId] = pick;
      return accumulator;
    }, {}),
    selectionsByGameId: buildSelectionMap(activePicks),
    stalePicks,
  };
};

export const savePicks = async ({
  owner,
  seasonId = CURRENT_SEASON_ID,
  userProfileId,
  entryName,
  contactEmail,
  tieBreakerValue,
  selectionsByGameId = {},
  requiredGameIds = [],
  tieBreakerRequired = false,
}) => {
  const client = getDataClient();
  const entry = await getOrCreateCurrentSeasonEntry({
    owner,
    seasonId,
    userProfileId,
    entryName,
    contactEmail,
    tieBreakerValue,
  });

  const existing = await loadSavedPicks({
    entryId: entry.id,
    seasonId,
    currentGameIds: requiredGameIds,
  });

  const requiredIdSet = new Set(requiredGameIds.filter(Boolean));
  const normalizedSelections = Object.entries(selectionsByGameId).reduce(
    (accumulator, [gameId, selectedTeam]) => {
      if (
        gameId &&
        requiredIdSet.has(gameId) &&
        typeof selectedTeam === "string" &&
        selectedTeam.trim()
      ) {
        accumulator[gameId] = selectedTeam.trim();
      }
      return accumulator;
    },
    {}
  );

  for (const [gameId, selectedTeam] of Object.entries(normalizedSelections)) {
    const existingPick = existing.picksByGameId[gameId];

    if (existingPick?.selectedTeam === selectedTeam) {
      continue;
    }

    if (existingPick) {
      const updateResult = await client.models.Pick.update(
        {
          id: existingPick.id,
          selectedTeam,
        },
        {
          selectionSet: PICK_SELECTION,
          authMode: "userPool",
        }
      );

      throwIfGraphQLError(updateResult, "Unable to update a saved pick.");
      continue;
    }

    const createResult = await client.models.Pick.create(
      {
        id: buildPickId(entry.id, gameId),
        seasonId,
        entryId: entry.id,
        gameId,
        owner,
        selectedTeam,
      },
      {
        selectionSet: PICK_SELECTION,
        authMode: "userPool",
      }
    );

    throwIfGraphQLError(createResult, "Unable to save a pick.");
  }

  const refreshedEntry = await getOrCreateCurrentSeasonEntry({
    owner,
    seasonId,
    userProfileId,
    entryName,
    contactEmail,
    tieBreakerValue,
  });
  const savedPicks = await loadSavedPicks({
    entryId: refreshedEntry.id,
    seasonId,
    currentGameIds: requiredGameIds,
  });

  return {
    entry: refreshedEntry,
    ...savedPicks,
    status: calculatePickSetStatus({
      requiredGameIds,
      selectionsByGameId: savedPicks.selectionsByGameId,
      tieBreakerRequired,
      tieBreakerValue: refreshedEntry.tieBreakerValue,
    }),
  };
};

export const savePick = async ({
  owner,
  seasonId = CURRENT_SEASON_ID,
  userProfileId,
  entryName,
  contactEmail,
  tieBreakerValue,
  gameId,
  selectedTeam,
  requiredGameIds = [],
  tieBreakerRequired = false,
}) => {
  const existingEntry = await getCurrentSeasonEntry({ owner, seasonId });
  const existingPicks = existingEntry
    ? await loadSavedPicks({
        entryId: existingEntry.id,
        seasonId,
        currentGameIds: requiredGameIds,
      })
    : { selectionsByGameId: {} };

  return savePicks({
    owner,
    seasonId,
    userProfileId,
    entryName,
    contactEmail,
    tieBreakerValue,
    requiredGameIds,
    tieBreakerRequired,
    selectionsByGameId: {
      ...existingPicks.selectionsByGameId,
      [gameId]: selectedTeam,
    },
  });
};
