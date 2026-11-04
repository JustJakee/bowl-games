const parseDeadline = (picksLockAt) => {
  if (!picksLockAt) {
    return Number.NaN;
  }

  return new Date(picksLockAt).getTime();
};

export const isPickWindowLocked = (picksLockAt, now = Date.now()) => {
  const deadline = parseDeadline(picksLockAt);
  return Number.isFinite(deadline) && deadline <= now;
};

// The stored lifecycle remains operator-controlled; readers derive the effective
// in-season state at the same global deadline used by pick controls.
export const getEffectiveSeasonStatus = ({
  seasonStatus,
  picksLockAt,
  now = Date.now(),
} = {}) => {
  const status = String(seasonStatus || "").toLowerCase();
  return status === "open" && isPickWindowLocked(picksLockAt, now)
    ? "locked"
    : status;
};

// The season lifecycle is the explicit operator-controlled source of truth.
// The deadline remains a safety net and lets the UI lock itself at the exact
// configured instant even before the next season refresh arrives.
export const isSeasonPickLocked = ({ seasonStatus, picksLockAt, now } = {}) =>
  ["locked", "complete", "archived"].includes(
    String(seasonStatus || "").toLowerCase(),
  ) || isPickWindowLocked(picksLockAt, now);

export const assertPickWindowOpen = (picksLockAt, now = Date.now()) => {
  const deadline = parseDeadline(picksLockAt);

  if (!Number.isFinite(deadline)) {
    throw new Error(
      "The season pick deadline is unavailable. Refresh before saving picks.",
    );
  }

  if (deadline <= now) {
    throw new Error("All picks are locked because the first game has begun.");
  }
};

export const formatPickLockMessage = (picksLockAt) => {
  const deadline = parseDeadline(picksLockAt);

  if (!Number.isFinite(deadline)) {
    return "All picks lock when the first game begins.";
  }

  const date = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(deadline);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(deadline);

  return `All picks lock when the first game begins on ${date} at ${time}.`;
};

export const formatCompactPickLockMessage = (picksLockAt) => {
  const deadline = parseDeadline(picksLockAt);

  if (!Number.isFinite(deadline)) {
    return "Picks lock when the first game begins.";
  }

  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(deadline);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(deadline);

  return `Picks lock ${date} at ${time}`;
};
