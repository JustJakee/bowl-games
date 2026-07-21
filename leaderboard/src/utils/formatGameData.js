import { fetchNcaafScoreboard } from "../api/espn";

const getNetwork = (comp) =>
  comp?.broadcasts?.[0]?.shortName || comp?.broadcasts?.[0]?.names?.[0] || "";
const getBowlName = (comp) => comp?.notes?.[0]?.headline || comp?.name || "";
const fmtKickoff = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
};

const fmtKickoffDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(d);
};

const formatGame = (event) => {
  const comp = event?.competitions?.[0] || {};
  const state = comp?.status?.type?.state || event?.status?.type?.state || "";
  const status =
    comp?.status?.type?.shortDetail || event?.status?.type?.shortDetail || "";
  const startIso = comp?.date || event?.date || "";
  const venue = comp?.venue || {};
  const venueAddress = venue?.address || {};
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || {};
  const home = competitors.find((c) => c.homeAway === "home") || {};

  const mkTeam = (side) => ({
    id: side?.team?.id,
    abbr:
      side?.team?.abbreviation ??
      side?.team?.shortDisplayName ??
      side?.team?.name ??
      "",
    score: side?.score ?? "",
    rank: side?.curatedRank?.current ?? side?.rank ?? null,
    logo: side?.team?.logo,
    color: side?.team?.color ?? "",
    alternateColor: side?.team?.alternateColor ?? "",
    displayName: side?.team?.displayName ?? "",
  });

  const kickoffText = fmtKickoff(startIso);
  const locationParts = [
    venue?.fullName,
    venueAddress?.city,
    venueAddress?.state,
  ].filter(Boolean);

  return {
    id: event?.id,
    bowl: getBowlName(comp),
    network: getNetwork(comp),
    state, // "in" | "post" | "pre"
    statusText: status || kickoffText,
    isFinal: (status || "").toLowerCase().startsWith("final"),
    startDate: startIso,
    startDateText: fmtKickoffDate(startIso),
    startTimeText: kickoffText,
    home: mkTeam(home),
    away: mkTeam(away),
    location: locationParts.join(" | "),
    venueName: venue?.fullName ?? "",
  };
};

const mapEventsToGames = (events = []) =>
  (events || []).filter(Boolean).map(formatGame);

const mapBackendStatusToState = (status) => {
  if (status === "in_progress") {
    return "in";
  }

  if (status === "final" || status === "canceled") {
    return "post";
  }

  return "pre";
};

const formatBackendTeam = ({
  id,
  abbr,
  displayName,
  score,
  rank,
  logo,
  color,
  alternateColor,
}) => ({
  id: id || "",
  abbr: abbr || "",
  score:
    score === null || score === undefined || Number.isNaN(Number(score))
      ? ""
      : String(score),
  rank: Number.isFinite(Number(rank)) ? Number(rank) : null,
  logo: logo || "",
  color: color || "",
  alternateColor: alternateColor || "",
  displayName: displayName || abbr || "",
});

export const formatStoredGame = (game) => {
  const startIso = game?.kickoffAt || "";
  const state = mapBackendStatusToState(game?.status);
  const statusText = game?.statusDetail || fmtKickoff(startIso) || "";
  const isFinal = game?.status === "final";

  const away = formatBackendTeam({
    id: `${game?.id || "game"}-away`,
    abbr: game?.teamAAbbr,
    displayName: game?.teamADisplayName || game?.teamA,
    score: state === "pre" ? null : game?.teamAScore,
    rank: game?.teamARank,
    logo: game?.teamALogo,
    color: game?.teamAColor,
    alternateColor: game?.teamAAlternateColor,
  });

  const home = formatBackendTeam({
    id: `${game?.id || "game"}-home`,
    abbr: game?.teamBAbbr,
    displayName: game?.teamBDisplayName || game?.teamB,
    score: state === "pre" ? null : game?.teamBScore,
    rank: game?.teamBRank,
    logo: game?.teamBLogo,
    color: game?.teamBColor,
    alternateColor: game?.teamBAlternateColor,
  });

  return {
    id: game?.id,
    bowl: game?.bowlName || game?.gameName || "Bowl Game",
    network: game?.network || "",
    state,
    statusText,
    isFinal,
    startDate: startIso,
    startDateText: fmtKickoffDate(startIso),
    startTimeText: fmtKickoff(startIso),
    home,
    away,
    location: game?.location || "",
    venueName: game?.venueName || "",
    winnerTeam: game?.winnerTeam || "",
  };
};

export const mapStoredGamesToDisplayGames = (games = []) =>
  (games || [])
    .filter(Boolean)
    .slice()
    .sort((left, right) => {
      const leftTime = left?.kickoffAt
        ? new Date(left.kickoffAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right?.kickoffAt
        ? new Date(right.kickoffAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .map(formatStoredGame);

export const fetchFormattedScoreboard = async () => {
  const raw = await fetchNcaafScoreboard();

  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map((game) => ({ ...game }));
  }

  return mapEventsToGames(raw?.events);
};

export {
  getNetwork,
  getBowlName,
  fmtKickoff,
  fmtKickoffDate,
  formatGame,
  mapEventsToGames,
};
