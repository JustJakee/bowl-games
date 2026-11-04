// DATA — PICKS — AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { getEntryById, updateEntry } from "./entryRepository";
import { assertPickWindowOpen } from "../utils/pickWindow";
import { readEntryPickPages } from "../../shared/entryPickQuery.mjs";

let testDependencies = null;

export const PICK_SET_STATUS = {
  DRAFT: "DRAFT",
  COMPLETE: "COMPLETE",
};

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
    getFirstGraphQLError(result) || cause?.message || fallbackMessage,
    cause ? { cause } : undefined,
  );
  error.name = diagnostics.correlationId
    ? "PickPersistenceError"
    : "PickDataError";
  Object.assign(error, diagnostics, {
    graphQLErrors: normalizeGraphQLErrors(
      result?.errors || cause?.errors || cause?.graphQLErrors,
    ),
    returnedData: result?.data ?? null,
  });
  return error;
};

const throwIfGraphQLError = (result, fallbackMessage, diagnostics = {}) => {
  if (result?.errors?.length) {
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
  if (
    !result.data?.id ||
    result.data.entryId !== diagnostics.entryId ||
    result.data.gameId !== diagnostics.gameId ||
    result.data.selectedTeam !== (diagnostics.selectedTeam ?? "")
  ) {
    throw buildRepositoryError({
      result,
      fallbackMessage: `${fallbackMessage} The backend did not confirm the selection.`,
      diagnostics,
    });
  }
  return result;
};

export const runSecurePickMutation = (
  client,
  { entryId, gameId, selectedTeam },
) =>
  client.mutations.saveSeasonPick(
    { entryId, gameId, selectedTeam },
    { authMode: "userPool" },
  );

const persistPickSelection = (client, input) =>
  testDependencies?.savePick
    ? testDependencies.savePick(input)
    : runSecurePickMutation(client, input);

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
  const rows = await readEntryPickPages(client, {
    entryId,
    seasonId,
    authMode: "userPool",
    label: "Unable to load your saved picks",
  });
  const picks = rows.filter(
    (pick) => pick.entryId === entryId && pick.seasonId === seasonId,
  );
  if (new Set(picks.map((pick) => pick.gameId)).size !== picks.length)
    throw new Error("Multiple saved picks exist for this entry and game.");

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
    throw new Error(
      "The tiebreaker game could not be found for this season.",
    );
  }

  return normalizedTieBreakerValue;
};

export const saveEntryState = async ({
  entryId,
  owner,
  seasonId,
  userProfileId,
  contactEmail,
  tieBreakerValue,
  tieBreakerGameId,
  selectionsByGameId = {},
  knownSelectionsByGameId = {},
  forceGameIds,
  currentGameIds = [],
  tieBreakerRequired = false,
  picksLockAt,
  now = Date.now(),
  onPickProgress,
}) => {
  // DATA — PICKS — AMPLIFY DATA
  // Save changed selections individually so an incomplete entry remains a resumable draft.
  // The entire entry closes at SeasonConfig.picksLockAt, before any player mutation is attempted.
  assertPickWindowOpen(picksLockAt, now);

  const entry = await readEntryById({ entryId, owner, seasonId });

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

  const forcedGameIdSet = new Set((forceGameIds || []).filter(Boolean));
  const changedSelections = Object.entries(nextSelections).filter(
    ([gameId, selectedTeam]) =>
      forcedGameIdSet.has(gameId) ||
      savedPicks.selectionsByGameId?.[gameId] !== selectedTeam,
  );
  const currentGameIdSet = new Set(currentGameIds.filter(Boolean));
  const previouslySelectedIds = new Set([
    ...Object.keys(savedPicks.selectionsByGameId),
    ...Object.keys(knownSelectionsByGameId).filter((id) =>
      Boolean(knownSelectionsByGameId[id]),
    ),
    ...forcedGameIdSet,
  ]);
  const clearedPicks = [...previouslySelectedIds]
    .filter(
      (gameId) =>
        currentGameIdSet.has(gameId) &&
        !nextSelections[gameId] &&
        // An individual draft's missing keys are not delete instructions. A
        // newer account pick may have appeared since this draft was hydrated.
        (!Array.isArray(forceGameIds) || forcedGameIdSet.has(gameId)),
    )
    .map(
      (gameId) =>
        savedPicks.picksByGameId[gameId] || {
          id: buildPickId(entry.id, gameId),
          gameId,
        },
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
  let acknowledgedClearCount = 0;
  const confirmedPicksByGameId = new Map(
    savedPicks.picks.map((pick) => [pick.gameId, pick]),
  );
  const confirmedPicks = () => {
    const picks = [...confirmedPicksByGameId.values()];
    return {
      picks,
      picksByGameId: Object.fromEntries(
        picks.map((pick) => [pick.gameId, pick]),
      ),
      selectionsByGameId: buildSelectionMap(picks),
      stalePicks: savedPicks.stalePicks,
    };
  };
  const throwWithPartialPickResult = async (error) => {
    error.completedPickChanges = completedPickChanges.slice();

    if (completedPickChanges.length > 0) {
      const refreshedPicks = confirmedPicks();
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
    }

    throw error;
  };

  const reportClearProgress = (acknowledgedChange = null) => {
    if (typeof onPickProgress !== "function") return;

    try {
      onPickProgress({
        completed: acknowledgedClearCount,
        total: clearedPicks.length,
        acknowledgedChange,
      });
    } catch {
      // Presentation callbacks must never affect persistence or retry behavior.
    }
  };

  reportClearProgress();

  for (const pick of clearedPicks) {
    try {
      const result = await executePickMutation({
        execute: () =>
          persistPickSelection(client, {
            entryId: entry.id,
            gameId: pick.gameId,
            selectedTeam: "",
          }),
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
      confirmedPicksByGameId.set(pick.gameId, result.data);
      completedPickChanges.push({
        gameId: pick.gameId,
        operation: "clear",
        selectedTeam: null,
      });
      acknowledgedClearCount += 1;
      reportClearProgress(completedPickChanges.at(-1));
    } catch (error) {
      await throwWithPartialPickResult(error);
    }
  }

  for (const [gameId, selectedTeam] of changedSelections) {
    const existingPick = savedPicks.picksByGameId[gameId];

    if (existingPick) {
      try {
        const result = await executePickMutation({
          execute: () =>
            persistPickSelection(client, {
              entryId: entry.id,
              gameId,
              selectedTeam,
            }),
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
        confirmedPicksByGameId.set(gameId, result.data);
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
      const result = await executePickMutation({
        execute: () =>
          persistPickSelection(client, {
            entryId: entry.id,
            gameId,
            selectedTeam,
          }),
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
      confirmedPicksByGameId.set(gameId, result.data);
      completedPickChanges.push({
        gameId,
        operation: "create",
        selectedTeam,
      });
    } catch (error) {
      await throwWithPartialPickResult(error);
    }
  }

  const normalizedContactEmail =
    contactEmail === undefined
      ? entry.contactEmail
      : String(contactEmail).trim();
  const entryUpdate = {
    entryId: entry.id,
    owner,
    seasonId,
  };

  if (normalizedContactEmail !== entry.contactEmail) {
    entryUpdate.contactEmail = normalizedContactEmail;
  }

  if (userProfileId && userProfileId !== entry.userProfileId) {
    entryUpdate.userProfileId = userProfileId;
  }

  if (normalizedTieBreakerValue !== persistedTieBreakerValue) {
    entryUpdate.tieBreakerValue = normalizedTieBreakerValue;
  }

  let nextEntry = entry;
  if (Object.keys(entryUpdate).length > 3) {
    try {
      nextEntry = await persistEntryUpdate(entryUpdate);
    } catch (error) {
      await throwWithPartialPickResult(error);
    }
  }

  // Mutation responses confirm these values. An immediate read from the
  // entry/game index can lag and must not restore an older selection.
  const refreshedPicks = confirmedPicks();

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
