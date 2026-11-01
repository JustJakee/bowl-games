# Gen 2 full-season regression: `test26-r2`

## Audit and scope

The existing `scripts/test26` seed already verifies the AWS account, Amplify app and branch,
stack, AppSync endpoint, Cognito pool, and deployed model hash. It reads current records,
prints a plan, requires a fresh confirmation hash, and refuses changed backend state. This
cycle reuses that code and `mockBowls2026.json`. It adds one allowed season namespace;
`test26` remains untouched. The 54 source events each have two teams and logos. The app
excludes all six games whose bowl names contain `FCS Championship` from picks, leaving
48 required selections.

The model has Season statuses `draft`, `open`, `locked`, `complete`, `archived` and Game
statuses `scheduled`, `in_progress`, `final`, `canceled`. Admin game editing is enabled
only when `Season.isTestSeason` is true. The seed sets that flag for `test26-r2`.
Scores and winners are saved through the admin game editor. Display and leaderboard data
come from stored Game records; the active season loader does not call ESPN. Fixture
`sourceEventId` values are synthetic (`fixture-test26-r2-01` through `-54`), so the
old ESPN-shaped IDs never appear as this season's source IDs.

The repository now routes player Pick and Entry writes through guarded backend operations.
Generated player model writes are denied; owner-only raw Pick reads remain available for
the player's own data. A guarded query reveals another player's selection only after that
game starts. The one-entry-per-player rule is checked on the backend; a deterministic
Entry ID makes simultaneous create requests contend on the same record. Existing duplicate
records are left intact and require explicit review if found. These controls have local
tests but still require deployment and two-token staging API validation before PASS.
Season's stored status remains operator-controlled; its effective locked state is derived
from the configured deadline. The backend independently enforces the earlier of that
deadline and the first scheduled kickoff.

## Staging setup and approval boundary

First deploy the guarded Data schema and function to the isolated staging branch, then
validate the deployed API with player and admin tokens. This runbook's seed/reset target
pins the previous model introspection hash; rebaseline that hash from the reviewed
staging schema before using either script. The `test26-r2` fixture and target season
namespace remain unchanged. Do not run a seed or reset against the old backend.

1. Use branch `gen2-updates` and staging Amplify app `d1mqezo38x3xb8` in `us-east-2`.
   Verify the deployed branch and stack match `scripts/test26/target.mjs`. Never use `main`.
2. In the staging app's **Hosting > Environment variables**, set a **branch override**
   for `gen2-updates`: `VITE_ACTIVE_SEASON_SLUG=test26-r2`. Confirm the override applies
   only to that branch, then rebuild that staging branch. This is an AWS configuration
   change and needs operator approval. The app's repository default is still `test26`.
3. In `leaderboard`, run `npm run seed:test26:outputs` with the staging AWS profile.
   This generates local output metadata; it does not write season data. Set
   `TEST26_ADMIN_EMAIL` and `TEST26_ADMIN_PASSWORD` in the local shell to an existing
   **staging** admin account. Never commit either value.
4. Schedule the run close to the test session. For a two-hour pick window and games
   five minutes apart, choose an ISO timestamp for `--start-at` at or before the
   session start. For example, replace `<ISO-start>` with a current timestamp:

   ```powershell
   npm run seed:test26-r2:dry-run -- --start-at <ISO-start> --picks-open-hours 2 --game-interval-minutes 5
   ```

   The script reads staging data and writes only a local `tmp/test26-r2-seed-plan.json`.
   Verify 1 Season, 1 SeasonConfig, 54 scheduled Games, zero existing entries/picks,
   no conflicts, all kickoff times in the future, and the exact staging target.
   The first kickoff equals `picksLockAt`. Repeating the same dry run after an
   unchanged apply should report zero intended mutations.
5. **Stop for explicit approval before this command.** Use only the confirmation
   printed by the immediately preceding dry run; it expires after 15 minutes:

   ```powershell
   npm run seed:test26-r2:apply -- --confirmation <AppSync-API-ID:plan-hash-prefix>
   ```

The seed never creates accounts, profiles, entries, picks, payments, or results.
It refuses to reschedule a season with entries or picks. It does not delete `test26`.
Do not run `season:mark-test`: the new seed already sets `isTestSeason=true`.

### Staging Cognito users

In the AWS Console, select region `us-east-2`, then **Cognito > User pools** and open
pool `us-east-2_XEbr1PiKq`. Confirm it belongs to the staging app. Under **Users**,
choose **Create user** five times with distinct test email addresses and the desired
invitation or temporary password option. Record account names in a private test log,
not the repo. For each user, open **Groups**, select the existing lowercase `player`
group, and add the user. Confirm none belongs to `admin`. Retain the existing staging
admin in the `admin` group. Have each player complete any first-login password change
and sign in once so the app creates its UserProfile. Leave self-service sign-up disabled.
AWS documents [administrator-created users](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html)
and [group membership](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html).

## Manual season run

1. Confirm the player UI loads `2026 Test Season R2`, 54 scheduled games, 48 pickable
   games, names, logos, dates, and an open global deadline. Record `Season`,
   `SeasonConfig`, Game IDs, and their initial status in the evidence log.
2. Player 1 creates one entry and picks **team A** in all 48 pickable games; set
   championship tiebreaker to **42**. Refresh, sign out/in, and verify persisted picks.
3. Player 2 selects the predetermined winner for every game (team A on odd game
   numbers, team B on even); tiebreaker **42**. Player 5 selects the opposite team
   in every game; tiebreaker **60**. Each uses one independent account and entry.
4. Player 3 leaves at least three pickable games empty and checks draft progress.
   The incomplete entry must stay off the scored leaderboard.
5. Player 4 selects team A for all pickable games except games **1 and 6**, where
   they select team B; tiebreaker **50**. Exercise randomize, unselect, clear with
   confirmation, reselect, rapid changes, refresh, second session, failed-request
   recovery, and persisted progress before settling on that final pattern.
6. For each account, create, save, update, refresh, and retrieve its own entry and
   picks. Compare the UI with actual GraphQL `Entry` and `Pick` records using that
   player's staging token. Check distinct entry IDs and one Pick per entry/game.
   Attempt a duplicate entry via the guarded mutation; it must fail. Test cross-owner
   reads/writes and pick visibility using a second player's token. Check that any
   pre-existing duplicate records are neither overwritten nor deleted.
7. Allow the configured first kickoff to pass. Re-read `SeasonConfig.picksLockAt`;
   verify UI locking in active and stale tabs, after refresh and sign-in, and via a
   direct GraphQL mutation. Verify guarded writes fail and generated player model
   writes are unauthorized. Do not infer API protection from the client's rejected save.
8. In the staging admin `/admin/games` editor, move game 1 through Scheduled,
   In Progress (e.g. 7–3), and Final (**24–17**). On game 2 use Final **14–28**.
   Continue all odd game numbers with A **24–17** and all even numbers with B
   **14–28**. Save and refresh after representative transitions. Test canceled
   status on a disposable game before restoring it; then finish all 54 games.
   This uses normal admin edits; no clock manipulation or ESPN synchronization is
   needed. Record LIVE/FINAL cards, ordering, winner styling, and scores.
9. Compare standings after games 1, 2, several middle games, and all games. The
   championship is game 54, so its final total is **42**. Verify rank and prize
   rendering on desktop and mobile. Check Dashboard, Picks, Schedule, Game Detail,
   Leaderboard, and admin game management at desktop and narrow mobile widths.

### Expected final standings with five independent accounts

The app excludes fixture games 2, 4, 5, 17, 18, and 51 from picks. Its 48 required
games have 24 odd and 24 even game numbers. The patterns above therefore yield:

| Rank | Entry | Correct | Incorrect pickable games | Tiebreaker distance from 42 |
| --- | --- | ---: | ---: | ---: |
| 1 | Player 2 | 48 | 0 | 0 |
| 2 | Player 1 | 24 | 24 | 0 |
| 3 | Player 4 | 24 | 24 | 8 |
| 4 | Player 5 | 0 | 48 | 18 |

Player 3 is incomplete and should be excluded. Prize values currently configured in
`leaderboardPrizes.js` are $500, $300, $150, and $100 for ranks 1–4; no payment
processing is part of this test. The leaderboard receives the 48 pickable games,
so its final records should read 48–0, 24–24, 24–24, and 0–48.
After game 1, the expected correct counts are 1/1/0/0 for Player 2,
Player 1, Player 4, and Player 5. Game 2 is not pickable, so these counts
remain unchanged after it becomes Final.
The championship tiebreaker applies only once game 54 is Final; until then,
equal-point entries have no defined secondary ordering in `scoreEntries`.

## Repeatability and cleanup

Preserve all `test26-r2` records as evidence through release validation. The seed can
rerun idempotently with the **same** schedule before entries exist, but refuses
schedule replacement after entries or picks. When evidence retention is complete,
the guarded reset can preview the IDs it would delete:

```powershell
npm run reset:test26-r2:dry-run
```

The preview validates the same staging target, lists only `test26-r2` Picks, Entries,
Games, SeasonConfig, and Season, and writes `tmp/test26-r2-reset-plan.json`. Review
the record counts and plan file. **Stop for separate explicit approval before any
reset apply.** The destructive command is:

```powershell
npm run reset:test26-r2:apply -- --confirmation <AppSync-API-ID:reset:plan-hash-prefix> --destructive-confirmation delete:test26-r2
```

The plan expires in 15 minutes and rejects changed backend state. Deletion runs in
child-to-parent order and can be retried with a new preview if interrupted. It does
not delete users, profiles, `test26`, or other-season data. A later seed must use a
new future schedule after reset. Do not truncate shared tables or reuse `test26`
as a reset shortcut.

## Regression checklist

Fill **Actual**, **Result**, and **Issue/action** while testing. Use PASS, FAIL, or
BLOCKED; retain screenshots, GraphQL responses, and record IDs in the evidence log.

| Scenario | Steps | Expected | Actual | Result | Issue/action |
| --- | --- | --- | --- | --- | --- |
| Staging target | Inspect dry-run target | Exact allowlisted account/app/branch/API/pool |  |  |  |
| Fixture creation | Apply approved plan, reload | 54 scheduled future games; 48 pickable |  |  |  |
| Logos and metadata | Inspect first/middle/last games | Both teams and logos render cleanly |  |  |  |
| First pick | Select empty game, query Pick | One saved Pick with correct owner/game |  |  |  |
| Change/unselect | Switch then clear, query Pick | Exactly one changed record, accurate counter |  |  |  |
| Rapid changes | Alternate sides rapidly, reload | Last settled selection persisted |  |  |  |
| Bulk actions | Randomize, fill remaining, clear, reselect | Existing picks preserved where specified |  |  |  |
| Failed request | Simulate failed mutation, retry | Error shown; backend and UI reconcile |  |  |  |
| One entry per player | Five accounts create entries; try duplicate create | Five independent IDs; duplicate denied |  |  |  |
| Session restore | Refresh, sign out/in, second browser | Same persisted selections, no loss |  |  |  |
| Pre-kickoff privacy | Query with another player's token | Other picks inaccessible |  |  |  |
| Owner auth | Read/update another entry and pick | Mutations denied; private fields hidden |  |  |  |
| Pick/Entry binding | Save a Pick for another player's entry ID | API rejects mismatched owner and entry |  |  |  |
| Global lock UI | Pass first kickoff, reload and stale tab | All pick controls locked, picks visible |  |  |  |
| Global lock API | Direct guarded and generated mutations after deadline | Guarded write rejected; generated player write denied |  |  |  |
| Season lifecycle | Read Season at first kickoff | Effective state locked; stored status may remain open |  |  |  |
| Game lifecycle | Admin Scheduled > Live > Final | Status and score persist; winner inferred |  |  |  |
| Canceled game | Cancel then restore test game | Canceled behavior and restored schedule correct |  |  |  |
| Scrolling scoreboard | Inspect live/upcoming/final cards | Ordered, muted FINAL, clear winner |  |  |  |
| Incremental scores | Finalize games 1 and 2 | Standings update after each |  |  |  |
| Final standings | Complete all games, compare table | 48/24/24/0 correct, ranks and prizes above |  |  |  |
| Desktop/mobile | Inspect all six listed pages | No clipping, overflow, or illegible leaderboard |  |  |  |
