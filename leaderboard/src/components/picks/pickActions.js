const copySelections = (selectionsByGameId = {}) => ({
  ...(selectionsByGameId || {}),
});

const getValidTeamCodes = (game) =>
  [game?.away?.abbr, game?.home?.abbr].filter(Boolean);

export const getFilterCountBadgeColors = (active) => ({
  backgroundColor: active ? "background.default" : "primary.main",
  color: active ? "text.primary" : "primary.contrastText",
});

export const buildEditableGameIdSet = ({
  games = [],
  picksLocked = false,
} = {}) =>
  new Set(
    picksLocked
      ? []
      : games.map((game) => game?.id).filter(Boolean),
  );

export const getPickActionsState = ({
  games = [],
  selectionsByGameId = {},
  editableGameIds = new Set(),
} = {}) => {
  const editableGames = games.filter((game) =>
    editableGameIds.has(game?.id),
  );
  const selectedEditableCount = editableGames.filter((game) =>
    Boolean(selectionsByGameId?.[game.id]),
  ).length;
  const incompleteEditableCount =
    editableGames.length - selectedEditableCount;

  return {
    canClear: selectedEditableCount > 0,
    canRandomize: incompleteEditableCount > 0,
    incompleteEditableCount,
    randomizeLabel:
      incompleteEditableCount === 0
        ? ""
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
    if (
      !editableGameIds.has(game?.id) ||
      nextSelections[game.id]
    ) {
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
