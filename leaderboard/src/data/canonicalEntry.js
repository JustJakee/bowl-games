// BUSINESS RULE - PICK SETS - CANONICAL ENTRY
// Player-facing workflows expose one entry per user and season while legacy records remain intact.

const toTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const latestPickActivityByEntryId = (picks = []) =>
  (picks || []).reduce((activity, pick) => {
    if (!pick?.entryId) return activity;

    const timestamp = Math.max(
      toTimestamp(pick.updatedAt),
      toTimestamp(pick.createdAt),
    );
    activity[pick.entryId] = Math.max(activity[pick.entryId] || 0, timestamp);
    return activity;
  }, {});

export const getCanonicalEntryUserKey = (entry) =>
  entry?.userProfile?.id ||
  entry?.userProfileId ||
  entry?.owner ||
  "";

export const compareCanonicalEntryCandidates = (
  left,
  right,
  pickActivityByEntryId = {},
) => {
  const leftUpdatedAt = toTimestamp(left?.updatedAt);
  const rightUpdatedAt = toTimestamp(right?.updatedAt);
  const leftCreatedAt = toTimestamp(left?.createdAt);
  const rightCreatedAt = toTimestamp(right?.createdAt);
  const leftEffective = Math.max(
    pickActivityByEntryId[left?.id] || 0,
    leftUpdatedAt,
    leftCreatedAt,
  );
  const rightEffective = Math.max(
    pickActivityByEntryId[right?.id] || 0,
    rightUpdatedAt,
    rightCreatedAt,
  );

  return (
    rightEffective - leftEffective ||
    rightUpdatedAt - leftUpdatedAt ||
    rightCreatedAt - leftCreatedAt ||
    String(left?.id || "").localeCompare(String(right?.id || ""))
  );
};

export const selectCanonicalEntry = ({
  entries = [],
  picks = [],
  owner,
  seasonId,
} = {}) => {
  const pickActivityByEntryId = latestPickActivityByEntryId(picks);
  const candidates = (entries || []).filter(
    (entry) =>
      entry &&
      entry.isDeleted !== true &&
      (!owner || entry.owner === owner) &&
      (!seasonId || entry.seasonId === seasonId),
  );

  return (
    candidates
      .slice()
      .sort((left, right) =>
        compareCanonicalEntryCandidates(left, right, pickActivityByEntryId),
      )[0] || null
  );
};

export const selectCanonicalEntriesByUser = ({
  entries = [],
  picks = [],
  seasonId,
} = {}) => {
  const groupedEntries = new Map();

  (entries || [])
    .filter(
      (entry) =>
        entry &&
        entry.isDeleted !== true &&
        (!seasonId || entry.seasonId === seasonId),
    )
    .forEach((entry) => {
      // An unlinked legacy record cannot safely be attributed to another player.
      const userKey = getCanonicalEntryUserKey(entry) || `entry:${entry.id}`;
      const group = groupedEntries.get(userKey) || [];
      group.push(entry);
      groupedEntries.set(userKey, group);
    });

  return Array.from(groupedEntries.values())
    .map((userEntries) =>
      selectCanonicalEntry({ entries: userEntries, picks, seasonId }),
    )
    .filter(Boolean);
};

export const runSingleFlight = (promiseRef, operation) => {
  if (promiseRef.current) return promiseRef.current;

  const promise = Promise.resolve()
    .then(operation)
    .finally(() => {
      if (promiseRef.current === promise) {
        promiseRef.current = null;
      }
    });
  promiseRef.current = promise;
  return promise;
};
