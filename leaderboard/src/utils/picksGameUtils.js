// UTIL — PICKS — GAME DISPLAY
const picksDateFormatter = (options) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    ...options,
  });

export const formatPicksDateKey = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    picksDateFormatter({ year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatPicksDateLabel = (value) => {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return picksDateFormatter({
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatPicksTimeLabel = (value) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return picksDateFormatter({
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
};

export const formatPicksMetaLabel = (game) => {
  const parts = [game?.startTimeText, game?.network].filter(Boolean);
  return parts.join(" | ");
};

export const getTeamIdentity = (displayName = "", fallbackAbbr = "") => {
  const safeName = String(displayName || "").trim();
  if (!safeName) {
    return {
      school: fallbackAbbr || "TBD",
      mascot: "",
    };
  }

  const words = safeName.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return { school: words[0], mascot: "" };
  }

  return {
    school: words.slice(0, -1).join(" "),
    mascot: words.at(-1) || "",
  };
};
