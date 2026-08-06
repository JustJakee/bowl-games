// VIEW MODEL — LOCKED PICKS — STATUS
const statusText = (game) => String(game?.statusText || "").toLowerCase();

export const getPickDisplayStatus = (game, selectedTeam) => {
  const text = statusText(game);
  if (text.includes("cancel")) return "canceled";
  if (text.includes("postpon")) return "postponed";
  if (game?.state === "in") return "live";

  if (game?.isFinal || game?.state === "post") {
    let winner = game?.winnerTeam || "";
    if (!winner) {
      const awayScore = Number(game?.away?.score);
      const homeScore = Number(game?.home?.score);
      if (Number.isFinite(awayScore) && Number.isFinite(homeScore) && awayScore !== homeScore) {
        winner = awayScore > homeScore ? game?.away?.abbr : game?.home?.abbr;
      }
    }
    return winner && winner === selectedTeam ? "correct" : "incorrect";
  }

  return "upcoming";
};

const timestamp = (value, fallback) => {
  const parsed = new Date(value || "").getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildLockedPickItems = ({ games = [], selectionsByGameId = {} }) =>
  games
    .map((game) => {
      const selectedTeamCode = selectionsByGameId?.[game.id];
      const selectedTeam = [game.away, game.home].find(
        (team) => team?.abbr === selectedTeamCode,
      );
      if (!selectedTeamCode || !selectedTeam) return null;
      return {
        id: game.id,
        game,
        selectedTeam,
        selectedTeamCode,
        status: getPickDisplayStatus(game, selectedTeamCode),
      };
    })
    .filter(Boolean);

export const getPickStatusCounts = (items = []) =>
  items.reduce(
    (counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }),
    { correct: 0, incorrect: 0, live: 0, upcoming: 0, canceled: 0, postponed: 0 },
  );

const sectionOrder = ["live", "correct", "incorrect", "upcoming", "canceled", "postponed"];

export const groupLockedPickItems = (items = [], activeFilter = "all") => {
  const eligibleStatuses = activeFilter === "all" ? sectionOrder : [activeFilter];
  return eligibleStatuses
    .map((status) => ({
      status,
      items: items
        .filter((item) => item.status === status)
        .slice()
        .sort((left, right) => {
          const leftTime = timestamp(left.game?.startDate, status === "upcoming" ? Number.MAX_SAFE_INTEGER : 0);
          const rightTime = timestamp(right.game?.startDate, status === "upcoming" ? Number.MAX_SAFE_INTEGER : 0);
          return status === "upcoming" || status === "live" ? leftTime - rightTime : rightTime - leftTime;
        }),
    }))
    .filter((section) => section.items.length || activeFilter !== "all");
};
