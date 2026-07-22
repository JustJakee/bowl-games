# Bob’s Bowl Games Testing Guide

This guide documents the `test26` simulated-season workflow used to test Bob’s Bowl Games before real bowl-season data is available.

`test26` is a development and staging tool. It is not the process that will populate the production season.

> Current status: The safe local seed commands described in this guide are the intended interface. Confirm that they exist in `package.json` before attempting to run them.

---

## 1. Purpose

The simulated season allows developers to test the complete application lifecycle without waiting for the real college football postseason.

The test should cover:

- Loading an active season
- Creating player entries
- Selecting and saving partial picks
- Returning later and resuming saved picks
- Completing an entry
- Enforcing the global picks deadline
- Preventing changes after picks lock
- Progressing games from scheduled to live and final
- Calculating correct picks and points
- Updating the leaderboard
- Exercising administrative workflows
- Verifying paid and unpaid entry handling

The simulation uses the same application models and player workflows as a real season, but its game schedule is compressed and generated relative to the test start time.

---

## 2. Test Season Versus Production Season

### `test26`

The `test26` season uses mock game data and relative kickoff times.

Its purpose is to provide a reusable development environment where the season can progress quickly enough to test locking, scoring, and leaderboard behavior.

The test seed creates:

- 1 `Season`
- 1 `SeasonConfig`
- 54 `Game` records

It must not create:

- Cognito users
- `UserProfile` records
- `Entry` records
- `Pick` records
- Payment records

Players and administrators create those records through the normal application workflows.

### Production season

The production season will use actual ESPN API data instead of the `test26` seed.

ESPN will provide game information such as:

- Event IDs
- Bowl names
- Teams
- Team logos and colors
- Kickoff times
- Networks
- Scores
- Game statuses
- Winners

The production import or synchronization process will be designed separately. The test seed must never be repurposed to populate production by simply changing its season ID.

---

## 3. Test Environment

Run all test-season commands from the `leaderboard` directory.

Example on Windows:

```powershell
cd C:\Users\Jake\Documents\GitHub\bowl-games\leaderboard
```

The simulated season must target the deployed `gen2-updates` staging backend.

It must never target:

- `main`
- The production backend
- An unverified AppSync API
- An arbitrary Amplify sandbox

A local `amplify_outputs.json` file alone does not prove which Amplify Hosting branch produced it. The seed tooling must positively verify the approved staging target before performing mutations.

---

## 4. Test Season Identity

The simulation uses stable identifiers so repeated dry runs can detect existing records instead of creating duplicates.

| Record | Identifier |
|---|---|
| Season ID | `test26` |
| Season slug | `test26` |
| Season name | `2026 Test Season` |
| SeasonConfig intended ID | `season-config-test26` |
| Game ID format | `game-test26-{sourceEventId}` |

The mock dataset currently contains 54 events with unique source event IDs.

Stable IDs allow the tooling to determine whether records should be created, updated, skipped, or treated as conflicts.

---

## 5. Simulated Schedule

The test schedule is calculated relative to a resolved simulation start time.

### Default timing

By default:

- `picksOpenAt` equals the simulation start.
- The first game kicks off exactly 24 hours after the simulation starts.
- `picksLockAt` equals the earliest generated game kickoff.
- All picks lock globally at `picksLockAt`.
- Later games have their own kickoff times but do not remain pickable after the first game starts.

The following equality must always be true:

```text
SeasonConfig.picksLockAt === earliest Game.kickoffAt
```

The 24-hour value represents the period available for making picks. It is not an independent client-side timer.

### Global locking behavior

Bob’s Bowl Games uses one global deadline for the complete bowl slate.

When the first eligible game begins:

- All entries lock.
- All picks lock.
- Picks for later games also become read-only.
- Players cannot create or change picks after the deadline.

Individual game kickoff times still control the progression of each game, but they do not provide separate pick deadlines.

### Relative game schedule

The 54 source games retain:

- Their stable source IDs
- Their original chronological order
- Their team and bowl information

Their active simulation kickoff times are recalculated from the test start time.

The first game is scheduled after the configured picks-open period. Each later game is placed after the previous game using the configured game interval.

This prevents the simulation from becoming obsolete because of permanently fixed calendar dates.

---

## 6. Intended Commands

These scripts must be implemented in `package.json` before use.

Confirm their existence with:

```powershell
npm run
```

### Run seed-tool tests

```powershell
npm run test:seed
```

This runs automated tests for schedule generation, target validation, dry-run behavior, conflict detection, and other seed safeguards.

### Preview the default simulation

```powershell
npm run seed:test26:dry-run
```

The default dry run should:

- Resolve the current time as the simulation start.
- Open picks immediately.
- Schedule the first game 24 hours later.
- Generate kickoff times for all 54 games.
- Query the staging backend without mutating it.
- Report planned creates, updates, skips, and conflicts.
- Produce a temporary plan hash for confirmation.

### Preview an exact start time

```powershell
npm run seed:test26:dry-run -- --start-at 2026-07-23T18:00:00-05:00
```

The value must be a valid ISO-8601 timestamp with an explicit time-zone offset or UTC designator.

Using an explicit time is helpful when multiple developers need to test the same schedule.

### Change the picks-open period

```powershell
npm run seed:test26:dry-run -- --picks-open-hours 12
```

This example makes the first game begin 12 hours after the simulation starts.

The resulting global `picksLockAt` must still equal that first kickoff.

### Change the spacing between games

```powershell
npm run seed:test26:dry-run -- --game-interval-minutes 30
```

This example spaces simulated game kickoffs 30 minutes apart.

### Combine schedule options

```powershell
npm run seed:test26:dry-run -- --start-at 2026-07-23T18:00:00-05:00 --picks-open-hours 24 --game-interval-minutes 30
```

### Apply the approved plan

After reviewing a successful dry run, use the exact confirmation value returned by it:

```powershell
npm run seed:test26:apply -- --confirmation <plan-hash>
```

Example placeholder:

```powershell
npm run seed:test26:apply -- --confirmation abc123-example-plan-hash
```

Do not copy the placeholder literally. Use the value produced by the current dry run.

The apply command should load the temporary plan, verify that it is still valid, confirm that the backend state has not changed, and then apply those exact proposed records.

Schedule arguments should not need to be repeated during apply because they are contained in the dry-run plan.

---

## 7. Mandatory Dry Run

Every apply operation must be preceded by a successful dry run.

The dry run must perform no GraphQL mutations.

It should report the following information.

### Target information

- AWS account ID
- AWS region
- Amplify app ID
- Amplify branch
- AppSync API ID
- AppSync endpoint
- Cognito user-pool ID
- Cognito client ID

The branch must be `gen2-updates`, and the identifiers must positively match the approved staging target.

### Simulation information

- Resolved simulation start
- `picksOpenAt`
- `picksLockAt`
- Earliest game ID and kickoff
- Latest game ID and kickoff
- Game interval
- Total simulated duration
- Confirmation that `picksLockAt` equals the earliest kickoff

### Record plan

- Season creates, updates, skips, and conflicts
- SeasonConfig creates, updates, skips, and conflicts
- Game creates, updates, skips, and conflicts
- Existing entry count
- Existing pick count
- Total intended mutations
- Duplicate-record findings

### Confirmation artifact

The dry run should create a temporary, uncommitted plan containing:

- The verified target
- The exact proposed records
- The observed backend state
- The schedule options
- A plan hash

Apply mode must reject:

- A missing plan
- An expired or invalid plan
- A mismatched plan hash
- A different target backend
- Backend changes made since the dry run

---

## 8. Expected First-Run Plan

If `test26` does not already exist, the expected candidate records are:

| Model | Expected count |
|---|---:|
| Season | 1 |
| SeasonConfig | 1 |
| Game | 54 |
| Entry | 0 |
| Pick | 0 |
| UserProfile | 0 |
| Payment record | 0 |
| Total seeded records | 56 |

Actual create, update, and skip totals depend on what already exists in the verified staging backend.

---

## 9. Idempotency and Duplicate Protection

The seed should be safe to inspect and rerun without silently creating duplicate records.

Required safeguards include:

- Find the season by both ID and slug.
- Block execution if the ID and slug resolve to conflicting seasons.
- Detect duplicate SeasonConfig records.
- Preserve the actual ID of an existing valid SeasonConfig.
- Paginate all backend list operations.
- Detect duplicate games by stable game ID.
- Detect duplicate games by source event ID.
- Stop if Season or SeasonConfig preparation fails.
- Do not continue into game mutations after a prerequisite failure.
- Skip records that already match the proposed values.
- Never delete unrelated records.

The process is not fully transactional, so prerequisite validation must complete before game writes begin.

---

## 10. Existing Entries and Picks

Rescheduling `test26` after players have submitted data can invalidate their picks.

Before changing an existing schedule, the seed must query for:

- Existing `Entry` records belonging to `test26`
- Existing `Pick` records associated with those entries

If entries or picks exist, the seed must refuse to replace or reschedule the season by default.

It should:

- Report the entry count.
- Report the pick count.
- Make no destructive changes.
- Return a nonzero exit code.
- Direct the developer to the future reset workflow.

The seed command must not delete entries or picks.

---

## 11. Resetting for Another Simulation

A guarded reset workflow is still future work.

The eventual repeated-test lifecycle will be:

```text
Reset previous test data
        ↓
Dry-run the new schedule
        ↓
Review target and record plan
        ↓
Apply the confirmed plan
        ↓
Run the simulated season
```

Until the reset command is implemented, do not manually delete test records without reviewing the relationships and deletion order.

A future reset tool should:

- Operate only on the verified staging backend.
- Require an explicit destructive confirmation.
- Display the exact records that will be removed.
- Delete test picks before their entries.
- Delete test entries before resetting the season schedule.
- Preserve user accounts and profiles.
- Never affect a non-test season.
- Never target production.
- Support a dry run.
- Verify completion before allowing a new seed.

---

## 12. Game Progression

Seeding scheduled games is only the first stage of the simulation.

The test also needs a way to progress games through states such as:

```text
scheduled → in progress → final
```

Depending on the implementation, game status may be:

- Stored directly in `Game.status`
- Derived from kickoff time
- Updated from ESPN data
- Updated by a test-only command

Kickoff timestamps can open and lock picks, but timestamps alone do not create final scores, winners, or scoring results.

A separate guarded simulation command may therefore be needed to:

- Mark a selected test game as in progress.
- Assign home and away scores.
- Mark the game final.
- Establish the winner.
- Trigger or verify pick scoring.
- Verify leaderboard changes.

This test-only mechanism has not been documented as implemented. Confirm current game-status and scoring behavior in the code before attempting progression.

It must never invent or modify production results.

---

## 13. Player Testing Workflow

After `test26` is seeded, use normal application behavior to create test data.

### Before the deadline

Verify that a signed-in player can:

1. Load the active `test26` season.
2. Create an entry.
3. Select one winner per game.
4. Save a partial set of picks.
5. Leave the page and return.
6. Recover the saved draft.
7. Change a selection before the deadline.
8. Complete all required picks.
9. Enter the championship tiebreaker.
10. Submit or save the complete entry.
11. Create another entry if desired.

Also verify:

- Entry ownership uses the signed-in user’s Cognito `sub`.
- One player cannot modify another player’s entries.
- Player entry creation does not write `paymentStatus`.
- Missing or redacted payment status is displayed safely as unpaid where applicable.
- Refreshing or background data loading does not erase saved picks.

### At the deadline

When the current time reaches `picksLockAt`, verify:

- All picks become read-only.
- Later games cannot still be selected.
- Existing picks remain visible.
- The tiebreaker becomes read-only.
- A player cannot bypass the UI and mutate a locked pick through the API.
- Browser refresh does not temporarily reopen editing.
- The interface clearly communicates that picks are locked.

### During game progression

Verify:

- Scheduled games display the correct kickoff information.
- In-progress games show their live state correctly.
- Final scores are displayed correctly.
- Correct picks receive the expected points.
- Incorrect picks do not receive points.
- Leaderboard totals update correctly.
- The tiebreaker is used only under the intended tie conditions.

### After the simulated season

Verify:

- Final standings are stable.
- Completed entries remain readable.
- Picks remain read-only.
- Admin corrections require a reason.
- Administrative changes are auditable.
- Archived or completed-season behavior matches the intended product rules.

---

## 14. Administrator Testing

Use an administrator account to verify:

- Player lookup
- Entry lookup
- Entry details
- Pick details
- Paid/unpaid status management
- Lock-state visibility
- Administrative corrections
- Required correction reasons
- Admin action history
- Archived-submission lookup, when available

Payment handling is administrative only. The application does not process payments.

Verify that:

- Entry owners can read their payment status.
- Players cannot create or update `paymentStatus`.
- Administrators can create or update `paymentStatus`.
- Restricted contact and payment fields are not exposed publicly.

---

## 15. Automated Validation

Before using or changing the seed tooling, run the relevant validation commands from `leaderboard`.

```powershell
npm run test:seed
npm run amplify:typecheck
npm run build
git diff --check
```

Focused seed tests should verify at least:

- The default first kickoff is exactly 24 hours after the start.
- `picksLockAt` equals the earliest kickoff.
- All 54 games retain deterministic stable IDs.
- Generated kickoff order is strictly chronological.
- Dry-run mode performs no mutations.
- The wrong AppSync API ID is rejected.
- The wrong branch or Amplify app is rejected.
- Apply without a valid dry-run plan is rejected.
- Existing entries or picks block schedule replacement.
- Existing matching records are skipped.
- Duplicate Season records block execution.
- Duplicate SeasonConfig records block execution.
- Duplicate Game records block execution.

---

## 16. Commands That Should Not Be Used

Do not use the following command for the deployed `gen2-updates` simulation:

```powershell
npx ampx sandbox seed --profile bobs-bowl-games
```

That command is associated with Amplify sandbox seeding. It does not, by itself, provide the required staging-target allowlist, dry-run plan, compressed schedule, or deployed-branch safeguards described here.

Do not use the browser-based **Seed test26** button if it still exists. The previous browser path began writes immediately and did not provide sufficient environment verification or a mandatory dry run.

---

## 17. Security Rules

Never commit:

- `amplify_outputs.json`
- Downloaded branch outputs
- AWS credentials
- Cognito tokens
- Temporary dry-run plans
- Plan confirmation hashes
- Local environment secrets

The seed must not weaken model authorization to make a local Node process work.

The tooling must use an approved developer or administrator authentication mechanism and the configured AWS profile without embedding credentials in source code.

All failures involving target verification, duplication, missing prerequisites, or stale plans must return a nonzero exit code.

---

## 18. Troubleshooting

### “Active season `test26` was not found”

This is expected before the test season has been seeded.

It confirms that the application is attempting to load `test26`, but it does not prove that the local seed tooling points to the correct backend.

Run the guarded dry run and verify the staging target before applying the seed.

### The dry run identifies the wrong backend

Stop immediately.

Do not apply the plan or replace output files until the correct `gen2-updates` outputs have been retrieved and verified.

### The dry run finds existing entries or picks

Do not reschedule the season.

Preserve the existing test data until a guarded reset workflow is available or the records have been deliberately reviewed.

### The season exists but games do not load

Check:

- The Season ID and slug
- The SeasonConfig relationship
- Game `seasonId` values
- Stable game IDs
- Authorization errors
- Pagination behavior
- Browser GraphQL errors

### Picks do not lock at the first kickoff

Verify that application authorization and UI behavior both use:

```text
SeasonConfig.picksLockAt
```

Confirm that:

```text
picksLockAt === earliest Game.kickoffAt
```

Do not fix this with an unrelated client-only timer.

### Games do not become live or final

The current test may require an explicit progression mechanism. Seeded kickoff times alone do not necessarily assign stored statuses, scores, or winners.

Inspect the current status and scoring implementation before changing game records.

---

## 19. Current Limitations and Future Work

The complete testing system may still need:

- A guarded `test26` reset command
- A safe game-progression command
- Test score and winner assignment
- Automated scoring verification
- Automated leaderboard assertions
- A clean way to repeat simulations with existing player accounts
- Production ESPN import and synchronization
- Production season configuration
- End-to-end authorization tests against the deployed backend

These should be developed separately from the initial safe seed workflow.

---

## 20. Quick Reference

### First simulation

```powershell
cd C:\Users\Jake\Documents\GitHub\bowl-games\leaderboard

npm run test:seed
npm run seed:test26:dry-run
npm run seed:test26:apply -- --confirmation <plan-hash>
```

### Custom simulation

```powershell
npm run seed:test26:dry-run -- --start-at 2026-07-23T18:00:00-05:00 --picks-open-hours 24 --game-interval-minutes 30
```

Then use the confirmation value returned by the dry run:

```powershell
npm run seed:test26:apply -- --confirmation <plan-hash>
```

### Standard validation

```powershell
npm run test:seed
npm run amplify:typecheck
npm run build
git diff --check
```

---

## 21. Core Rules to Remember

1. `test26` is for staging simulation only.
2. Production games will come from ESPN.
3. Run all commands from `leaderboard`.
4. Always dry-run before applying.
5. Positively verify the `gen2-updates` target.
6. Picks open at the simulation start.
7. The first kickoff controls the global deadline.
8. `picksLockAt` must equal the earliest kickoff.
9. All picks lock together.
10. The seed creates only Season, SeasonConfig, and Games.
11. Existing entries or picks block rescheduling.
12. Never use test tooling against production.
13. Game results require a separate verified progression mechanism.
14. Confirm commands exist before running them.