// API — SCOREBOARD — ESPN
const USE_MOCK_ESPN_DATA = import.meta.env?.VITE_USE_MOCK_ESPN_DATA === "true";
const ESPN_FBS_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/football/college-football/standings?group=80&seasontype=2&type=0&level=1";
let fbsTeamsPromise = null;

// Mock mode preserves ESPN's response envelope so live and fixture data share one normalization path.

export async function fetchNcaafScoreboard(params = {}) {
  if (USE_MOCK_ESPN_DATA) {
    const mockModule = await import("../assets/mockBowls2026.json");
    return mockModule.default;
  }

  const base =
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?seasontype=3";
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), { method: "GET" });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`ESPN API error ${response.status}: ${text}`);
  }

  return response.json();
}

const collectStandingsTeams = (group, teams) => {
  const entries = group?.standings?.entries;
  if (Array.isArray(entries)) {
    entries.forEach((entry) => {
      if (entry?.team) teams.push(entry.team);
    });
  }

  if (Array.isArray(group?.children)) {
    group.children.forEach((child) => collectStandingsTeams(child, teams));
  }
};

const defaultLogo = (logos) => {
  if (!Array.isArray(logos)) return "";
  return (
    logos.find(
      (logo) =>
        Array.isArray(logo?.rel) &&
        logo.rel.includes("default") &&
        typeof logo.href === "string",
    )?.href ||
    logos.find((logo) => typeof logo?.href === "string")?.href ||
    ""
  );
};

export const normalizeFbsTeams = (payload) => {
  const rawTeams = [];
  collectStandingsTeams(payload, rawTeams);
  const teamsById = new Map();

  rawTeams.forEach((team) => {
    const id = String(team?.id || "").trim();
    const displayName = String(team?.displayName || "").trim();
    if (!id || !displayName || teamsById.has(id)) return;

    teamsById.set(id, {
      id,
      displayName,
      abbreviation: String(team?.abbreviation || "").trim(),
      shortDisplayName: String(team?.shortDisplayName || "").trim(),
      location: String(team?.location || "").trim(),
      name: String(team?.name || "").trim(),
      logo: defaultLogo(team?.logos),
    });
  });

  return [...teamsById.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "en", {
      sensitivity: "base",
    }),
  );
};

export const fetchFbsTeams = ({ force = false } = {}) => {
  if (!force && fbsTeamsPromise) return fbsTeamsPromise;

  fbsTeamsPromise = fetch(ESPN_FBS_STANDINGS_URL, { method: "GET" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`ESPN team API error ${response.status}`);
      }
      const teams = normalizeFbsTeams(await response.json());
      if (!teams.length) throw new Error("ESPN returned no FBS teams.");
      return teams;
    })
    .catch((error) => {
      fbsTeamsPromise = null;
      throw error;
    });

  return fbsTeamsPromise;
};

export const __resetFbsTeamsCacheForTests = () => {
  fbsTeamsPromise = null;
};
