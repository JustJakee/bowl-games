// AUTHORIZATION — ADMIN GAME MANAGEMENT
// This deliberately answers only the season-data prerequisite. Future routes
// must additionally verify the caller has the admin role.
export const isAdminGameManagementEnabled = (season) =>
  season?.isTestSeason === true;
