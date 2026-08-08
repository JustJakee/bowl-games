// AUTHORIZATION — ADMIN GAME MANAGEMENT
// This deliberately answers only the season-data prerequisite. Future routes
// must additionally verify the caller has the admin role.
export const isAdminGameManagementEnabled = (season) =>
  season?.isTestSeason === true;

export const ADMIN_GAME_STATUSES = [
  "scheduled",
  "in_progress",
  "final",
  "canceled",
];

export const formatAdminGameStatus = (status) => ({
  scheduled: "Scheduled",
  in_progress: "Live",
  final: "Final",
  canceled: "Canceled",
}[status] || "Scheduled");

export const getGameWinner = ({ status, teamAScore, teamBScore, teamAAbbr, teamBAbbr }) => {
  if (status !== "final") return "";
  if (Number(teamAScore) > Number(teamBScore)) return teamAAbbr || "";
  if (Number(teamBScore) > Number(teamAScore)) return teamBAbbr || "";
  return "";
};

export const validateGameDraft = (draft) => {
  if (!draft?.bowlName?.trim()) return "Bowl name is required.";
  if (!draft?.kickoffAt) return "Kickoff date and time are required.";
  if (draft.status !== "final") return "";

  const scores = [draft.teamAScore, draft.teamBScore];
  if (scores.some((score) => score === "" || score === null || score === undefined || !Number.isInteger(Number(score)) || Number(score) < 0)) {
    return "Final games require valid non-negative scores.";
  }
  if (Number(draft.teamAScore) === Number(draft.teamBScore)) {
    return "Final games must have a winner.";
  }
  return "";
};

export const toGameUpdateInput = (draft) => {
  const winnerTeam = getGameWinner(draft);
  const score = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
  return {
    id: draft.id,
    bowlName: draft.bowlName.trim(),
    kickoffAt: draft.kickoffAt,
    network: draft.network?.trim() || null,
    venueName: draft.venueName?.trim() || null,
    location: draft.location?.trim() || null,
    status: draft.status,
    teamAScore: score(draft.teamAScore),
    teamBScore: score(draft.teamBScore),
    statusDetail: draft.status === "in_progress" ? draft.statusDetail?.trim() || null : null,
    winnerTeam,
  };
};
