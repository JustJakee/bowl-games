const USE_MOCK_ESPN_DATA = import.meta.env.VITE_USE_MOCK_ESPN_DATA === "true";

// Minimal ESPN API helper for NCAAF (college football)
// Endpoint: ESPN public scoreboard for college football
// Example: https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard

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
