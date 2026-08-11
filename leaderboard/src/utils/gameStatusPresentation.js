// UI — GAME STATUS — PRESENTATION
// Keep status accents explicit so completed games never inherit live/primary styling.
export const GAME_STATUS_PRESENTATION = Object.freeze({
  live: Object.freeze({
    accent: "#ef233c",
  }),
  final: Object.freeze({
    accent: "#687684",
    badgeBackground: "#46525e",
    badgeBorder: "#8793a0",
    badgeText: "#f4f7fa",
    cardBackground: "#303941",
    cardBackgroundEnd: "#20272e",
    metadataText: "#adb6be",
    metadataAccent: "#7f8c98",
    divider: "rgba(195, 205, 214, 0.14)",
    pickText: "#c0c8cf",
    pickBorder: "rgba(154, 168, 180, 0.56)",
    pickHover: "rgba(154, 168, 180, 0.14)",
    winnerSurface: "rgba(244, 247, 250, 0.07)",
    winnerText: "#f5f8ff",
  }),
});

export const getGameStatusPresentation = (status) =>
  GAME_STATUS_PRESENTATION[status] || null;

// Stored winner data is authoritative. The score fallback supports completed
// scoreboard feeds that have not supplied an explicit winner abbreviation.
export const getFinalGameWinner = (game) => {
  if (game?.winnerTeam) return game.winnerTeam;

  const awayScore = Number(game?.away?.score);
  const homeScore = Number(game?.home?.score);
  if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore) || awayScore === homeScore) {
    return "";
  }

  return awayScore > homeScore ? game?.away?.abbr || "" : game?.home?.abbr || "";
};
