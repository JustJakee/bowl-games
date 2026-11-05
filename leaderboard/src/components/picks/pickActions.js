const copySelections = (selectionsByGameId = {}) => ({
  ...(selectionsByGameId || {}),
});

export const matchesEditableSelections = ({
  requested = {},
  confirmed = {},
  editableGameIds = new Set(),
}) =>
  [...editableGameIds].every(
    (gameId) => (requested[gameId] || "") === (confirmed[gameId] || ""),
  );

const getValidTeamCodes = (game) =>
  [game?.away?.abbr, game?.home?.abbr].filter(Boolean);

const hasTieBreakerValue = (value) =>
  value === 0 || Boolean(String(value ?? "").trim());

const RANDOM_TIEBREAKER_MIN = 35;
const RANDOM_TIEBREAKER_MAX = 85;

export const getFilterCountBadgeColors = (active) => ({
  backgroundColor: active ? "background.default" : "divider",
  color: active ? "text.primary" : "text.secondary",
});

export const buildEditableGameIdSet = ({
  games = [],
  picksLocked = false,
} = {}) =>
  new Set(picksLocked ? [] : games.map((game) => game?.id).filter(Boolean));

export const getPickActionsState = ({
  games = [],
  selectionsByGameId = {},
  editableGameIds = new Set(),
  tieBreakerRequired = false,
  tieBreakerValue = "",
} = {}) => {
  const editableGames = games.filter((game) => editableGameIds.has(game?.id));
  const selectedEditableCount = editableGames.filter((game) =>
    Boolean(selectionsByGameId?.[game.id]),
  ).length;
  const incompleteEditableCount = editableGames.length - selectedEditableCount;
  const canRandomizeTieBreaker =
    editableGames.length > 0 &&
    tieBreakerRequired &&
    !hasTieBreakerValue(tieBreakerValue);

  return {
    canClear: selectedEditableCount > 0,
    canRandomize: incompleteEditableCount > 0 || canRandomizeTieBreaker,
    canRandomizeTieBreaker,
    incompleteEditableCount,
    randomizeLabel:
      incompleteEditableCount === 0 && !canRandomizeTieBreaker
        ? ""
        : incompleteEditableCount === 0
          ? "Randomize Tiebreaker"
          : selectedEditableCount === 0
            ? "Randomize All Picks"
            : "Randomize Remaining Picks",
    selectedEditableCount,
  };
};

export const randomizeIncompleteSelections = ({
  games = [],
  selectionsByGameId = {},
  editableGameIds = new Set(),
  random = Math.random,
} = {}) => {
  const nextSelections = copySelections(selectionsByGameId);

  games.forEach((game) => {
    if (!editableGameIds.has(game?.id) || nextSelections[game.id]) {
      return;
    }

    const teamCodes = getValidTeamCodes(game);
    if (teamCodes.length !== 2) {
      return;
    }

    const randomIndex = random() < 0.5 ? 0 : 1;
    nextSelections[game.id] = teamCodes[randomIndex];
  });

  return nextSelections;
};

export const randomizeRequiredTieBreaker = ({
  tieBreakerRequired = false,
  tieBreakerValue = "",
  random = Math.random,
} = {}) => {
  if (!tieBreakerRequired || hasTieBreakerValue(tieBreakerValue)) {
    return tieBreakerValue;
  }

  const roll = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  const value =
    RANDOM_TIEBREAKER_MIN +
    Math.floor(roll * (RANDOM_TIEBREAKER_MAX - RANDOM_TIEBREAKER_MIN + 1));
  return String(value);
};

export const randomizePickSet = ({
  games = [],
  selectionsByGameId = {},
  editableGameIds = new Set(),
  tieBreakerRequired = false,
  tieBreakerValue = "",
  random = Math.random,
} = {}) => ({
  selectionsByGameId: randomizeIncompleteSelections({
    games,
    selectionsByGameId,
    editableGameIds,
    random,
  }),
  tieBreakerValue: randomizeRequiredTieBreaker({
    tieBreakerRequired,
    tieBreakerValue,
    random,
  }),
});

export const clearEditableSelections = ({
  selectionsByGameId = {},
  editableGameIds = new Set(),
} = {}) => {
  const nextSelections = copySelections(selectionsByGameId);

  editableGameIds.forEach((gameId) => {
    delete nextSelections[gameId];
  });

  return nextSelections;
};

export const buildClearAllDraft = ({ draft, editableGameIds, revision }) => {
  const selectionsByGameId = clearEditableSelections({
    selectionsByGameId: draft.selectionsByGameId,
    editableGameIds,
  });
  return {
    ...draft,
    selectionsByGameId,
    changedGameIds: [
      ...new Set([
        ...(draft.changedGameIds || []),
        // Clear is a command for every applicable game, not a diff of a possibly
        // stale device snapshot. Each empty selection needs an acknowledgment.
        ...editableGameIds,
      ]),
    ],
    revision,
    dirty: true,
    clearAll: true,
    clearError: null,
  };
};

export const toggleGameSelection = ({
  gameId,
  selectedTeam,
  selectionsByGameId = {},
  editableGameIds = new Set(),
} = {}) => {
  const nextSelections = copySelections(selectionsByGameId);

  if (!gameId || !editableGameIds.has(gameId)) {
    return nextSelections;
  }

  if (nextSelections[gameId] === selectedTeam) {
    delete nextSelections[gameId];
  } else {
    nextSelections[gameId] = selectedTeam;
  }

  return nextSelections;
};
