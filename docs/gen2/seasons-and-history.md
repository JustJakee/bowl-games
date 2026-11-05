# Season lifecycle and historical results

[Index](README.md)

## Selecting and loading a season

[seasonRepository.js](../../leaderboard/src/data/seasonRepository.js) selects the
slug from `VITE_ACTIVE_SEASON_SLUG`, defaulting to `test26`. It loads the Season,
SeasonConfig, and persisted Game records, then maps games into display objects.
A missing selected season is a setup error, not a reason to invent live data.

`ScoreboardProvider` reloads the bundle every 60 seconds by default. Initial
loading and background refreshing are separate, and auth loss clears state.
Blank bowl names and FCS Championship games are filtered from pickable games.
The compact scoreboard additionally excludes later CFP rounds; the full picks
and schedule use the broader game list.

## Stored state and effective presentation

`Season.status` is operator-controlled: `draft`, `open`, `locked`, `complete`,
or `archived`. No scheduler automatically persists a new status at kickoff.

[seasonExperience.js](../../leaderboard/src/utils/seasonExperience.js) derives:

| Presentation | Trigger                                                               |
| ------------ | --------------------------------------------------------------------- |
| Unavailable  | Missing season/config or invalid opening/lock interval                |
| Pending      | Draft, or open before configured opening time                         |
| Picks Open   | Open and before configured lock time                                  |
| Final        | Complete/archived, or all games final/canceled after earlier branches |
| In Progress  | A game is in progress or final after earlier branches                 |
| Locked       | Remaining valid states                                                |

The ordering in that helper matters: its open-window branch runs before game
completion checks. It uses configured lock time. The secure-picks service uses
the earlier of configured lock time and first kickoff, so align season timings
with the schedule rather than assuming every presentation helper independently
calculates the server deadline.

[pickWindow.js](../../leaderboard/src/utils/pickWindow.js) and
`usePickWindowLocked` drive deadline feedback and read-only pick controls.
Stored locked/complete/archived states also lock the player UI. Backend server
time remains authoritative.

`isTestSeason` enables test-season admin game tools; it does not open picks,
override deadlines, or automatically set the selected season.

## Season Pending

[SeasonPendingPage](../../leaderboard/src/pages/SeasonPendingPage.jsx) provides
the offseason/pending experience for the selected season. It preserves access
to previous results and the existing suggestion destination with a one-hour
browser-local cooldown. Approval state is a separate gate: approving a user
does not change season state, games, or timing.

The lifecycle and pending behavior were introduced with the latest registration
work. See the [staging validation plan](../backend/gen2-registration-season-pending.md)
for Pending → Picks Open → Locked → In Progress → Final verification.

## Historical results

[previousSeasonResults.js](../../leaderboard/src/data/previousSeasonResults.js)
lists seasons with pagination and chooses the newest earlier complete/archived
year. It loads that season's games and leaderboard data and computes the top
four and championship total from persisted records.

[historicalResults.js](../../leaderboard/src/data/historicalResults.js) preserves
the labeled 2025 results as a fallback for a selected 2026 season. The fallback
also covers an empty 2025 result set. It is not an invented 2026 podium.

For future historical results, retain Season, Game, Entry, and Pick records and
mark the completed season appropriately. Dynamic results do not yet have a
general historical payout source; add one explicitly if archived awards must
display. `ArchivedSubmission` is available in the schema but does not establish
a complete legacy-import workflow.
