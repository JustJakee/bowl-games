# Frontend, navigation, and scoring

[Index](README.md)

## Build and layout migration

Create React App/react-scripts was replaced with Vite. The active scripts are
`npm start`/`npm run dev`, `npm run build`, and `npm run preview`. Production
artifacts are `leaderboard/dist/`. The configured development port is **5174**.

The app uses React 18, React Router 6, MUI/Emotion, and the shared theme in
`src/theme/theme.js`. Desktop headers/sidebar and mobile header/bottom navigation
live in `src/layout`. `ScrollToTop` handles route changes. Separate admin layout
and navigation keep management workflows together.

Player and admin navigation show a shared `BuilderCredit` beneath sign-out on
desktop and in mobile drawers. It reads “Built by Two Jakes ↗” and opens
`https://www.twojakesdigital.com/` in a new tab, with keyboard focus styling and
an accessible new-tab label.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | Redirect to dashboard |
| `/dashboard` | Season-aware player overview |
| `/picks` | Canonical pick set, draft editing or locked results |
| `/entries` | Redirect to picks; older entry page remains in source |
| `/schedule` | Game schedule and pick splits |
| `/schedule/:gameId` | Individual matchup/results view |
| `/leaderboard` | Season standings and podium |
| `/rules` | Contest rules |
| `/more` | Additional/account navigation |
| `/admin` | Redirect to admin entries |
| `/admin/entries` | Player completion and payment management |
| `/admin/games` | Test-season game management |
| `/admin/registrations` | Registration approval |
| `/admin/account` | Account view via MorePage |

The auth shell gates the application. `AuthenticatedApp` redirects admins away
from player routes to admin entries; the admin layout handles its own role
boundary. A route redirect does not replace Data authorization.

## Player experience changes

- Dashboard components show season status, entry progress, pick-lock summary,
  upcoming bowls, quick links, and leaderboard previews.
- Picks evolved from multiple entry cards into one canonical player pick set.
  Draft saves, deselection, loading, error, and locked/read-only states are
  explicit. Locked views include game progress and result presentation.
- Schedule/game views show normalized stored matchup details, logos, kickoff,
  network/venue, live/final status, scores, and permitted pick split information.
- Shared components handle empty states, team logos, status/payment chips,
  panels, and scoreboard cards.
- Leaderboard UI has dedicated header, podium, desktop table, mobile list,
  identity, prize-tag, and view-model modules under `src/features/leaderboard`.
- Season Pending and previous-season results extend the dashboard lifecycle.

The active season feed comes from Gen 2 storage, polled by
`src/context/NCAAFDataContext.jsx`. The file name predates that integration.
`src/api/espn.js` and mock data remain, but an automated production ingestion
service is not established by the current provider.

## Scoring behavior

[leaderboardRepository.js](../../leaderboard/src/data/leaderboardRepository.js)
combines safe Entry fields with `visibleSeasonPicks`, follows list pagination,
and resolves canonical entries. [useSeasonLeaderboard](../../leaderboard/src/hooks/useSeasonLeaderboard.js)
scores against the season's display games.

[leaderboardScoring.js](../../leaderboard/src/utils/leaderboardScoring.js):

- Includes complete pick sets; guarded reads supply `completeEntryIds` so hidden
  choices do not make a fully submitted entry appear incomplete.
- Awards one point for each selection matching a known winner in a final game.
- Displays the record as correct picks versus final games not picked correctly.
- Sorts points descending, then smallest absolute distance from the final
  championship combined score when a usable tiebreaker exists.
- Assigns sequential ranks after sorting. Shared-rank semantics are not defined.

Although the schema includes confidence/rank/points fields and scoring JSON,
the current standings helper is a one-point-per-correct-pick calculation.
Do not assume schema fields enable additional scoring formats automatically.

The active UI prize definitions and legacy historical payouts are distinct;
future configurable awards should have an explicit data source and tests.
