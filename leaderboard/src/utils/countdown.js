const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatDeadline = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Deadline TBD";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
};

export const formatCountdown = (value, now = Date.now()) => {
  const target = new Date(value).getTime();

  if (Number.isNaN(target)) {
    return "Countdown unavailable";
  }

  const remaining = target - now;

  if (remaining <= 0) {
    return "Picks are locked";
  }

  const days = Math.floor(remaining / DAY);
  const hours = Math.floor((remaining % DAY) / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
};
