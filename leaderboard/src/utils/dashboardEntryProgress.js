import {
  calculatePickSetStatus,
  PICK_SET_STATUS,
} from "../data/picksRepository.js";

export const buildDashboardEntries = ({
  entries = [],
  progressByEntryId = {},
  totalPicks = 0,
  picksLocked = false,
  tieBreakerRequired = false,
}) =>
  entries.map((entry) => {
    const progress = progressByEntryId[entry.id] || {};
    const selectionsByGameId = progress.selectionsByGameId || {};
    const requiredGameIds = progress.requiredGameIds || [];
    const completedPicks = requiredGameIds.filter((gameId) =>
      Boolean(selectionsByGameId[gameId]),
    ).length;
    const pickStatus = calculatePickSetStatus({
      requiredGameIds,
      selectionsByGameId,
      tieBreakerRequired,
      tieBreakerValue: entry.tieBreakerValue,
    });
    const needsTieBreaker =
      tieBreakerRequired &&
      (!Number.isSafeInteger(entry.tieBreakerValue) ||
        entry.tieBreakerValue < 0);
    const isComplete =
      pickStatus === PICK_SET_STATUS.COMPLETE && !needsTieBreaker;

    return {
      id: entry.id,
      name: entry.entryName,
      completedPicks,
      totalPicks,
      isComplete,
      needsTieBreaker,
      status: picksLocked ? "Locked" : isComplete ? "Complete" : "In Progress",
    };
  });
