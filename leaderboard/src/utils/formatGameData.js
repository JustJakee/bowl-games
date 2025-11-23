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
    startTimeText: kickoffText,
    home: mkTeam(home),
    away: mkTeam(away),
    location: locationParts.join(" | "),
    venueName: venue?.fullName ?? "",
  };
};

const mapEventsToGames = (events = []) =>
  (events || []).filter(Boolean).map(formatGame);

export const fetchFormattedScoreboard = async () => {
  const raw = await fetchNcaafScoreboard();
  return mapEventsToGames(raw?.events);
};

export { getNetwork, getBowlName, fmtKickoff, formatGame, mapEventsToGames };
