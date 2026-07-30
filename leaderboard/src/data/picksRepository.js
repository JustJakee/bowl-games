// DATA — PICKS — AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { getEntryById, updateEntry } from "./entryRepository";
import { assertPickWindowOpen } from "../utils/pickWindow";

let testDependencies = null;

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
  return testDependencies?.dataClient || configuredDataClient;
};

const readEntryById = (input) =>
  (testDependencies?.getEntryById || getEntryById)(input);

const persistEntryUpdate = (input) =>
  (testDependencies?.updateEntry || updateEntry)(input);

const readSeasonGames = async (input) => {
  if (testDependencies?.listRawSeasonGames) {
    return testDependencies.listRawSeasonGames(input);
  }

  const { listRawSeasonGames } = await import("./seasonRepository");
  return listRawSeasonGames(input);
};

export const __setPicksRepositoryDependenciesForTests = (dependencies) => {
  testDependencies = dependencies;
};

const getFirstGraphQLError = (result) => result?.errors?.[0]?.message || null;

const createCorrelationId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `pick-save-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeGraphQLErrors = (errors = []) =>
  errors.map((error) => ({
    message: error?.message || "Unknown GraphQL error.",
    path: error?.path || null,
    errorType: error?.errorType || error?.extensions?.errorType || null,
    errorInfo: error?.errorInfo || error?.extensions?.errorInfo || null,
  }));

const buildRepositoryError = ({
  result,
  cause,
  fallbackMessage,
  diagnostics = {},
}) => {
  const error = new Error(
    getFirstGraphQLError(result) ||
      cause?.message ||
      fallbackMessage,
    cause ? { cause } : undefined,
  );
  error.name = diagnostics.correlationId
    ? "PickPersistenceError"
    : "PickDataError";
  Object.assign(error, diagnostics, {
    graphQLErrors: normalizeGraphQLErrors(result?.errors),
    returnedData: result?.data ?? null,
  });
  return error;
};

const throwIfGraphQLError = (
  result,
  fallbackMessage,
  diagnostics = {},
) => {
  const errorMessage = getFirstGraphQLError(result);

  if (errorMessage) {
    throw buildRepositoryError({
      result,
      fallbackMessage,
      diagnostics,
    });
  }

  if (!result) {
    throw buildRepositoryError({
      result,
      fallbackMessage,
      diagnostics,
    });
  }
};

const executePickMutation = async ({
  execute,
  fallbackMessage,
  diagnostics,
}) => {
  let result;

  try {
    result = await execute();
  } catch (cause) {
    throw buildRepositoryError({
      cause,
      fallbackMessage,
      diagnostics,
    });
  }

  throwIfGraphQLError(result, fallbackMessage, diagnostics);
  return result;
};

const sanitizeIdPart = (value) =>
  String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const buildPickId = (entryId, gameId) =>
  `pick-${sanitizeIdPart(entryId)}-${sanitizeIdPart(gameId)}`;

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
  // BUSINESS RULE — TIEBREAKER — NATIONAL CHAMPIONSHIP
  // Completion requires every current matchup plus the predicted total when the season config requires it.
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
  const picks = [];
  let nextToken;

  do {
    const result = await client.models.Pick.pickByEntryAndGame(
      { entryId },
      {
        filter: {
          seasonId: { eq: seasonId },
        },
        nextToken,
        selectionSet: PICK_SELECTION,
        authMode: "userPool",
      },
    );

    throwIfGraphQLError(result, "Unable to load your saved picks.");
    picks.push(
      ...(result.data || []).filter(
        (pick) =>
          pick && pick.entryId === entryId && pick.seasonId === seasonId,
      ),
    );
    nextToken = result.nextToken || null;
  } while (nextToken);

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

};

const validateTieBreaker = ({ tieBreakerValue, tieBreakerGame }) => {
  const normalizedTieBreakerValue = normalizeTieBreakerValue(tieBreakerValue);

  if (normalizedTieBreakerValue === null) {
    return null;
  }

  if (!tieBreakerGame) {
    throw new Error("The tiebreaker game could not be found for this season.");
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
  picksLockAt,
  now = Date.now(),
}) => {
  // DATA — PICKS — AMPLIFY DATA
  // Save changed selections individually so an incomplete entry remains a resumable draft.
  // The entire entry closes at SeasonConfig.picksLockAt, before any player mutation is attempted.
  assertPickWindowOpen(picksLockAt, now);

  const entry = await readEntryById({ entryId, owner });

  if (!entry) {
    throw new Error("The requested entry was not found.");
  }

  if (entry.seasonId !== seasonId) {
    throw new Error("That entry does not belong to the active season.");
  }

  const [savedPicks, seasonGames] = await Promise.all([
    loadEntryPicks({ entryId, seasonId, currentGameIds }),
    readSeasonGames({ seasonId }),
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
  const currentGameIdSet = new Set(currentGameIds.filter(Boolean));
  const clearedPicks = savedPicks.picks.filter(
    (pick) =>
      currentGameIdSet.has(pick.gameId) &&
      Boolean(savedPicks.selectionsByGameId[pick.gameId]) &&
      !nextSelections[pick.gameId],
  );

  for (const [gameId, selectedTeam] of changedSelections) {
    const game = gamesById.get(gameId);

    if (!game) {
      throw new Error("One of the selected games could not be found.");
    }

    validateSelection({ game, selectedTeam });
  }

  const persistedTieBreakerValue = entry.tieBreakerValue ?? null;
  const normalizedTieBreakerValue =
    tieBreakerValue === undefined
      ? persistedTieBreakerValue
      : validateTieBreaker({
          tieBreakerValue,
          tieBreakerGame: tieBreakerGameId
            ? gamesById.get(tieBreakerGameId)
            : null,
        });

  const client = getDataClient();
  const correlationId = createCorrelationId();
  const completedPickChanges = [];
  const throwWithPartialPickResult = async (error) => {
    error.completedPickChanges = completedPickChanges.slice();

    if (completedPickChanges.length > 0) {
      try {
        const refreshedPicks = await loadEntryPicks({
          entryId: entry.id,
          seasonId,
          currentGameIds,
        });
        error.partialResult = {
          entry,
          ...refreshedPicks,
          status: calculatePickSetStatus({
            requiredGameIds: currentGameIds,
            selectionsByGameId: refreshedPicks.selectionsByGameId,
            tieBreakerRequired,
            tieBreakerValue: entry.tieBreakerValue,
          }),
        };
      } catch (partialReadError) {
        error.partialReadError = {
          name: partialReadError?.name || "Error",
          message:
            partialReadError?.message ||
            "Unable to reconcile partially saved picks.",
        };
      }
    }

    throw error;
  };

  for (const pick of clearedPicks) {
    try {
      await executePickMutation({
        execute: () =>
          client.models.Pick.update(
            {
              id: pick.id,
              selectedTeam: "",
            },
            {
              selectionSet: PICK_SELECTION,
              authMode: "userPool",
            },
          ),
        fallbackMessage: "Unable to clear a saved pick.",
        diagnostics: {
          correlationId,
          operation: "clear",
          entryId: entry.id,
          gameId: pick.gameId,
          pickId: pick.id,
          selectedTeam: null,
        },
      });
      completedPickChanges.push({
        gameId: pick.gameId,
        operation: "clear",
        selectedTeam: null,
      });
    } catch (error) {
      await throwWithPartialPickResult(error);
    }
  }

  for (const [gameId, selectedTeam] of changedSelections) {
    const existingPick = savedPicks.picksByGameId[gameId];

    if (existingPick) {
      try {
        await executePickMutation({
          execute: () =>
            client.models.Pick.update(
              {
                id: existingPick.id,
                selectedTeam,
              },
              {
                selectionSet: PICK_SELECTION,
                authMode: "userPool",
              },
            ),
          fallbackMessage: "Unable to update a saved pick.",
          diagnostics: {
            correlationId,
            operation: "update",
            entryId: entry.id,
            gameId,
            pickId: existingPick.id,
            selectedTeam,
          },
        });
        completedPickChanges.push({
          gameId,
          operation: "update",
          selectedTeam,
        });
      } catch (error) {
        await throwWithPartialPickResult(error);
      }
      continue;
    }

    const pickId = buildPickId(entry.id, gameId);
    try {
      await executePickMutation({
        execute: () =>
          client.models.Pick.create(
            {
              id: pickId,
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
          ),
        fallbackMessage: "Unable to save a pick.",
        diagnostics: {
          correlationId,
          operation: "create",
          entryId: entry.id,
          gameId,
          pickId,
          selectedTeam,
        },
      });
      completedPickChanges.push({
        gameId,
        operation: "create",
        selectedTeam,
      });
    } catch (error) {
      await throwWithPartialPickResult(error);
    }
  }

  const normalizedEntryName =
    entryName === undefined ? entry.entryName : String(entryName).trim();
  const normalizedContactEmail =
    contactEmail === undefined
      ? entry.contactEmail
      : String(contactEmail).trim();
  const entryUpdate = {
    entryId: entry.id,
    owner,
    seasonId,
  };

  if (normalizedEntryName !== entry.entryName) {
    entryUpdate.entryName = normalizedEntryName;
  }

  if (normalizedContactEmail !== entry.contactEmail) {
    entryUpdate.contactEmail = normalizedContactEmail;
  }

  if (userProfileId && userProfileId !== entry.userProfileId) {
    entryUpdate.userProfileId = userProfileId;
  }

  if (normalizedTieBreakerValue !== persistedTieBreakerValue) {
    entryUpdate.tieBreakerValue = normalizedTieBreakerValue;
  }

  const nextEntry =
    Object.keys(entryUpdate).length > 3
      ? await persistEntryUpdate(entryUpdate)
      : entry;

  const refreshedPicks = await loadEntryPicks({
    entryId: entry.id,
    seasonId,
    currentGameIds,
  });

  return {
    correlationId,
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
