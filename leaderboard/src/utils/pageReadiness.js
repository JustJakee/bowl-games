const isEntryScopePending = ({
  entriesError,
  entriesLoading,
  entriesReady,
  seasonId,
}) =>
  Boolean(seasonId) &&
  !entriesError &&
  (entriesLoading || !entriesReady);

export const isDashboardPageLoading = ({
  currentEntryId,
  entriesError,
  entriesLoading,
  entriesReady,
  hydratedEntryId,
  picksError,
  picksLoading,
  scoreboardError,
  scoreboardLoading,
  seasonId,
  usesEntryData = true,
}) => {
  if (scoreboardError) return false;
  if (scoreboardLoading) return true;
  if (!usesEntryData) return false;
  if (
    isEntryScopePending({
      entriesError,
      entriesLoading,
      entriesReady,
      seasonId,
    })
  ) {
    return true;
  }

  return Boolean(
    currentEntryId &&
      !picksError &&
      (picksLoading || hydratedEntryId !== currentEntryId),
  );
};

export const isAccountPageLoading = ({
  entriesError,
  entriesLoading,
  entriesReady,
  scoreboardError,
  scoreboardLoading,
  seasonId,
}) =>
  !scoreboardError &&
  (scoreboardLoading ||
    isEntryScopePending({
      entriesError,
      entriesLoading,
      entriesReady,
      seasonId,
    }));

export const isGamesPageLoading = ({ scoreboardError, scoreboardLoading }) =>
  !scoreboardError && scoreboardLoading;

export const isLeaderboardPageLoading = ({
  leaderboardError,
  leaderboardReady,
  leaderboardSeasonId,
  scoreboardError,
  scoreboardLoading,
  seasonId,
}) => {
  if (scoreboardError || leaderboardError) return false;
  if (scoreboardLoading) return true;
  if (!seasonId) return false;
  return !leaderboardReady || leaderboardSeasonId !== seasonId;
};

export const isPicksPageLoading = ({
  activeDraftReady,
  currentEntryId,
  draftCacheReady,
  draftReconciled,
  entriesError,
  entriesLoading,
  entriesReady,
  hydratedEntryId,
  picksError,
  picksLocked,
  scoreboardError,
  scoreboardLoading,
  seasonId,
}) => {
  if (scoreboardError || entriesError) return false;
  if (scoreboardLoading) return true;
  if (
    isEntryScopePending({
      entriesError,
      entriesLoading,
      entriesReady,
      seasonId,
    })
  ) {
    return true;
  }
  if (!currentEntryId || picksError) return false;
  if (hydratedEntryId !== currentEntryId) return true;
  if (picksLocked) return false;
  return !draftCacheReady || !activeDraftReady || !draftReconciled;
};
