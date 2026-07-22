export const SELECTED_ENTRY_PICK_LOAD_MIN_MS = 750;

export const getSelectedEntryPickLoadRemainingMs = ({
  startedAt = 0,
  now = Date.now(),
}) => {
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return SELECTED_ENTRY_PICK_LOAD_MIN_MS;
  }

  const elapsedMs = Math.max(0, now - startedAt);
  return Math.max(0, SELECTED_ENTRY_PICK_LOAD_MIN_MS - elapsedMs);
};
