import { calculatePickSetStatus, PICK_SET_STATUS } from "../../data/picksRepository";

export const buildPickSelectionView = ({
  currentEntry,
  hydratedEntryId = "",
  activeDraft,
  games = [],
  picksLocked = false,
  tieBreakerRequired = false,
}) => {
  const selectedEntryId = currentEntry?.id || "";
  const isLoadingSelectedEntryPicks = Boolean(
    selectedEntryId && hydratedEntryId !== selectedEntryId,
  );
  const visibleDraft = isLoadingSelectedEntryPicks ? null : activeDraft;
  const selectionsByGameId = visibleDraft?.selectionsByGameId || {};
  const tieBreakerValue = visibleDraft?.tieBreakerValue ?? "";
  const hasTieBreaker =
    tieBreakerValue === 0 || Boolean(String(tieBreakerValue || "").trim());

  const selectedCount = games.filter((game) =>
    Boolean(selectionsByGameId?.[game.id]),
  ).length;
  const incompleteCount = games.filter((game) => {
    const hasSelection = Boolean(selectionsByGameId?.[game.id]);
    if (!hasSelection) return true;
    if (game.isTieBreakerGame && tieBreakerRequired && !hasTieBreaker) {
      return true;
    }
    return false;
  }).length;
  const progressPercent =
    games.length > 0 ? Math.round((selectedCount / games.length) * 100) : 0;
  const entryStatus = isLoadingSelectedEntryPicks
    ? "LOADING"
    : picksLocked
      ? "LOCKED"
      : calculatePickSetStatus({
          requiredGameIds: games.map((game) => game.id),
          selectionsByGameId,
          tieBreakerRequired,
          tieBreakerValue,
        }) === PICK_SET_STATUS.COMPLETE
        ? "COMPLETE"
        : "DRAFT";

  return {
    entryStatus,
    hasTieBreaker,
    incompleteCount,
    isLoadingSelectedEntryPicks,
    progressPercent,
    selectedCount,
    selectionsByGameId,
    tieBreakerValue,
  };
};
