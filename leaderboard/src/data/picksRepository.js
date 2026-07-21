import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { getEntryById, updateEntry } from "./entryRepository";
import { listRawSeasonGames } from "./seasonRepository";

export const PICK_SET_STATUS = {
  DRAFT: "DRAFT",
  COMPLETE: "COMPLETE",
};

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

const sanitizeIdPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const buildPickId = (entryId, gameId) =>
  `pick-${sanitizeIdPart(entryId)}-${sanitizeIdPart(gameId)}`;

export const isGameLocked = (kickoffAt, now = Date.now()) => {
  if (!kickoffAt) {
    return false;
  }

  const kickoffTime = new Date(kickoffAt).getTime();

  if (Number.isNaN(kickoffTime)) {
    return false;
  }

  return kickoffTime <= now;
};

const normalizeTieBreakerValue = (tieBreakerValue) => {
  if (
    tieBreakerValue === "" ||
    tieBreakerValue === null ||
    tieBreakerValue === undefined
  ) {
    return null;
  }

  if (!/^\d+$/.test(String(tieBreakerValue).trim())) {
    throw new Error("Tiebreaker must be a non-negative whole number.");
  }

  return Number(tieBreakerValue);
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
    Boolean(selectionsByGameId?.[gameId]),
  );
  const hasTieBreaker =
    !tieBreakerRequired ||
    tieBreakerValue === 0 ||
    Boolean(String(tieBreakerValue ?? "").trim());

  return hasAllSelections && hasTieBreaker
    ? PICK_SET_STATUS.COMPLETE
    : PICK_SET_STATUS.DRAFT;
};

export const loadEntryPicks = async ({
  entryId,
  seasonId,
  currentGameIds = [],
}) => {
  if (!entryId || !seasonId) {
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
    (pick) => currentIdSet.size > 0 && !currentIdSet.has(pick.gameId),
  );
  const activePicks = picks.filter(
    (pick) => currentIdSet.size === 0 || currentIdSet.has(pick.gameId),
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

const validateSelection = ({ game, selectedTeam }) => {
  const allowedTeams = [game?.teamAAbbr, game?.teamBAbbr].filter(Boolean);

  if (!allowedTeams.includes(selectedTeam)) {
    throw new Error("The selected team does not belong to that game.");
  }

  if (isGameLocked(game?.kickoffAt)) {
    throw new Error(`"${game?.bowlName || "This game"}" is already locked.`);
  }
};

const validateTieBreaker = ({ tieBreakerValue, tieBreakerGame }) => {
  const normalizedTieBreakerValue = normalizeTieBreakerValue(tieBreakerValue);

  if (normalizedTieBreakerValue === null) {
    return null;
  }

  if (!tieBreakerGame) {
    throw new Error("The tiebreaker game could not be found for this season.");
  }

  if (isGameLocked(tieBreakerGame.kickoffAt)) {
    throw new Error("The tiebreaker is locked because that game has started.");
  }

  return normalizedTieBreakerValue;
};

export const saveEntryState = async ({
  entryId,
  owner,
  seasonId,
  userProfileId,
  entryName,
  contactEmail,
  tieBreakerValue,
  tieBreakerGameId,
  selectionsByGameId = {},
  currentGameIds = [],
  tieBreakerRequired = false,
}) => {
  const entry = await getEntryById({ entryId, owner });

  if (!entry) {
    throw new Error("The requested entry was not found.");
  }

  if (entry.seasonId !== seasonId) {
    throw new Error("That entry does not belong to the active season.");
  }

  const [savedPicks, seasonGames] = await Promise.all([
    loadEntryPicks({ entryId, seasonId, currentGameIds }),
    listRawSeasonGames({ seasonId }),
  ]);
  const gamesById = new Map(seasonGames.map((game) => [game.id, game]));
  const nextSelections = Object.entries(selectionsByGameId).reduce(
    (accumulator, [gameId, selectedTeam]) => {
      if (gameId && typeof selectedTeam === "string" && selectedTeam.trim()) {
        accumulator[gameId] = selectedTeam.trim();
      }

      return accumulator;
    },
    {},
  );

  const changedSelections = Object.entries(nextSelections).filter(
    ([gameId, selectedTeam]) =>
      savedPicks.selectionsByGameId?.[gameId] !== selectedTeam,
  );

  for (const [gameId, selectedTeam] of changedSelections) {
    const game = gamesById.get(gameId);

    if (!game) {
      throw new Error("One of the selected games could not be found.");
    }

    validateSelection({ game, selectedTeam });
  }

  const normalizedTieBreakerValue =
    tieBreakerValue === undefined
      ? entry.tieBreakerValue
      : validateTieBreaker({
          tieBreakerValue,
          tieBreakerGame: tieBreakerGameId
            ? gamesById.get(tieBreakerGameId)
            : null,
        });

  const client = getDataClient();

  for (const [gameId, selectedTeam] of changedSelections) {
    const existingPick = savedPicks.picksByGameId[gameId];

    if (existingPick) {
      const updateResult = await client.models.Pick.update(
        {
          id: existingPick.id,
          selectedTeam,
        },
        {
          selectionSet: PICK_SELECTION,
          authMode: "userPool",
        },
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
      },
    );

    throwIfGraphQLError(createResult, "Unable to save a pick.");
  }

  const nextEntry = await updateEntry({
    entryId: entry.id,
    owner,
    seasonId,
    entryName,
    contactEmail,
    tieBreakerValue: normalizedTieBreakerValue,
    userProfileId,
  });

  const refreshedPicks = await loadEntryPicks({
    entryId: entry.id,
    seasonId,
    currentGameIds,
  });

  return {
    entry: nextEntry,
    ...refreshedPicks,
    status: calculatePickSetStatus({
      requiredGameIds: currentGameIds,
      selectionsByGameId: refreshedPicks.selectionsByGameId,
      tieBreakerRequired,
      tieBreakerValue: nextEntry.tieBreakerValue,
    }),
  };
};
