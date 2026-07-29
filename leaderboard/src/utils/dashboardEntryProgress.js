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
    const completedPicks = Object.values(selectionsByGameId).filter(
      Boolean,
    ).length;
    const pickStatus = calculatePickSetStatus({
      requiredGameIds: progress.requiredGameIds || [],
      selectionsByGameId,
      tieBreakerRequired,
      tieBreakerValue: entry.tieBreakerValue,
    });

    return {
      id: entry.id,
      name: entry.entryName,
      completedPicks,
      totalPicks,
      status: picksLocked
        ? "Locked"
        : pickStatus === PICK_SET_STATUS.COMPLETE
          ? "Complete"
          : "In Progress",
    };
  });
