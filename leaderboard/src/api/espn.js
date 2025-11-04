// Minimal ESPN API helper for NCAAF (college football)
// Endpoint: ESPN public scoreboard for college football
// Example: https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard

export async function fetchNcaafScoreboard(params = {}) {
  const base = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';
  const url = new URL(base);

  // Allow optional params like { dates: '20250101', groups: 80, week: 1 }
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ESPN API error ${res.status}: ${text}`);
  }
  return res.json();
}
