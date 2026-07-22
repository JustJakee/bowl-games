# test26 local simulation seed

The `test26` seed is a guarded local CLI. It is not available in the application UI and it
creates or updates only `Season`, `SeasonConfig`, and `Game` records.

## Verified staging target

- AWS account: `366318196751`
- Region: `us-east-2`
- Amplify app: `d1mqezo38x3xb8`
- Branch: `gen2-updates`
- Backend stack: `amplify-d1mqezo38x3xb8-gen2updates-branch-fa2e4382d5`
- AppSync API ID: `fc74wtinsjcspi74ytcwustquu`
- AppSync endpoint ID: `wjkgh6uun5dlrbq5mlu4xjloga`
- Cognito user pool: `us-east-2_XEbr1PiKq`

The CLI positively checks every target identifier before connecting. A different account,
app, branch, backend stack, AppSync endpoint, API ID, user pool, or client is rejected. The
`main` branch cannot satisfy this allowlist even though it belongs to the same Amplify app.

## Prerequisites and outputs

1. Authenticate AWS CLI profile `bobs-bowl-games` with read access to Amplify and STS.
2. Use a staging Cognito account in the `admin` group. Set its credentials only in the current
   shell as `TEST26_ADMIN_EMAIL` and `TEST26_ADMIN_PASSWORD`; never store them in the repository.
   The standalone Node CLI deliberately uses Amplify's process-local in-memory token storage;
   SSR cookie storage requires a browser cookie document and cannot retain this CLI session.
3. Retrieve fresh branch outputs into the ignored isolated directory:

   ```powershell
   npm run seed:test26:outputs
   ```

This runs the installed `ampx generate outputs` command for app `d1mqezo38x3xb8` and branch
`gen2-updates`, writing `tmp/amplify-outputs-gen2-updates/amplify_outputs.json`. It never
overwrites the root application output. Generated outputs and plans under `tmp/` are ignored.
The seed does not accept an alternate `--outputs` path. It verifies the exact deployed model
introspection hash and required `Game` mutation fields before authentication or backend writes.

## Mandatory dry run

Run the read-only planner as a separate process:

```powershell
npm run seed:test26:dry-run -- --start-at 2026-08-01T12:00:00Z
```

If `--start-at` is omitted, the process captures the current time once and reports the resolved
ISO timestamp. Optional schedule arguments are:

```text
--picks-open-hours <positive number>       default: 24
--game-interval-minutes <positive number>  default: 15
--profile <AWS profile>                    default: bobs-bowl-games
```

The first game starts exactly `picks-open-hours` after `picksOpenAt`. Every later game starts
one interval after the previous game. `picksLockAt` is derived from the minimum generated game
kickoff and the report verifies that it equals the first kickoff. With 54 games and defaults,
the last kickoff is 37 hours 15 minutes after the simulation start.

Dry run paginates all backend reads and reports the target, schedule, create/update/skip/conflict
counts, unmanaged games, and existing Entry/Pick counts. It performs no mutations. A successful
run writes a 15-minute local plan containing exact proposed values, a backend-state hash, and a
confirmation value. Conflicts produce a nonzero exit and no plan.

## Apply

Apply is deliberately a separate process and requires the exact confirmation printed by dry run:

```powershell
npm run seed:test26:apply -- --confirmation fc74wtinsjcspi74ytcwustquu:<plan-hash-prefix>
```

Apply revalidates the live AWS target, isolated outputs, plan signature and expiry, confirmation,
and current backend-state hash before its first mutation. Missing, changed, expired, or conflicting
plans fail closed. If test26 entries or picks exist, any schedule-changing plan is refused; the CLI
never deletes them. Matching records are skipped. Conflicting season IDs/slugs, duplicate configs,
and duplicate game IDs/source IDs are blocking errors. Stable game IDs independently encode each
source event, so an ID/source mismatch is also blocking. Game queries and mutation serialization use
only fields verified in the isolated deployed model metadata. Existing valid SeasonConfig IDs are
retained.

## Records and limitations

The plan contains one `Season` (`test26`), one `SeasonConfig`, and 54 deterministically identified
games (`game-test26-{sourceEventId}`). It never creates users, profiles, entries, picks, or payment
data. Games begin with stored status `scheduled`, empty results, and independent kickoff timestamps.
The plan stores `SeasonConfig.scoringConfigJson` as a JSON-encoded string because the deployed
`AWSJSON` mutation scalar requires that wire shape. Apply passes it through the same
metadata-checked input preparation used by the seed tests.

The application currently displays game progression from stored `Game.status` and result fields;
time alone does not advance a game to live or final. ESPN remains a separate scoreboard data source.
No simulation-advance or fake-results command is included here.

The application does not currently enforce the full
`picksOpenAt <= current time < picksLockAt` window for writes. It enforces pick writes against each
game's kickoff instead of the global `SeasonConfig.picksLockAt`, and it does not enforce the
`picksOpenAt` lower bound. The dashboard displays the global deadline, but the repository and pick
controls use per-game locking. That known behavior gap is intentionally not changed by this seed
safety work.
