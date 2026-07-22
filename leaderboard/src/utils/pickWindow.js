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
