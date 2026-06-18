export const SEASON_LOCK_DEADLINE = "2026-12-19T11:00:00-06:00";

export const dashboardPickStatus = {
  entryName: "Jake's Picks",
  status: "In Progress",
  completedPicks: 18,
  totalPicks: 42,
  tiebreaker: "Not Set",
};

export const dashboardEntries = [
  {
    id: "entry-1",
    name: "Jake's Picks",
    completedPicks: 18,
    totalPicks: 42,
    status: "In Progress",
  },
  {
    id: "entry-2",
    name: "Family Bracket",
    completedPicks: 42,
    totalPicks: 42,
    status: "Submitted",
  },
];

export const dashboardLeaderboard = [
  { rank: 1, username: "mturner", entryName: "Main Card", points: 134, record: "34-8" },
  { rank: 2, username: "bkoons", entryName: "Holiday Heater", points: 130, record: "33-9" },
  { rank: 3, username: "jake", entryName: "Jake's Picks", points: 128, record: "32-10" },
  { rank: 4, username: "amyr", entryName: "Family Bracket", points: 124, record: "31-11" },
  { rank: 5, username: "coachbob", entryName: "Office Pool", points: 118, record: "29-13" },
];

export const dashboardQuickLinks = [
  { label: "View Schedule", description: "See every bowl and kickoff", to: "/schedule", icon: "schedule" },
  { label: "Rules & Scoring", description: "Review the pool rules", to: "/rules", icon: "rules" },
  { label: "How to Play", description: "Account and picks overview", to: "/more", icon: "help" },
];
