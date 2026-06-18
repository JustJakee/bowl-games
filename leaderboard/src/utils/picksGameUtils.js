export const formatPicksDateLabel = (value) => {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
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
