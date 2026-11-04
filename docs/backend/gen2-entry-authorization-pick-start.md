# Gen 2 entry authorization and first-pick workflow

Scope: local implementation on `gen2-updates`, November 3, 2026. Deployment requires
separate approval. No staging records, season dates, Cognito configuration, or
production resources are changed by this work.

## Authorization finding

The staging API's `Entry.owner` pipeline uses `EntryOwnerDataResolverFn`. Its request
permits an admin or a caller whose `claims.sub` equals `source.owner`; other callers
receive an authorization error. Its response deliberately returns null when the
source operation is a generated model Mutation. These restrictions are retained.

The old shared player selection requested `owner` on `listEntries`, `getEntry`,
`createSeasonEntry`, and `updateSeasonEntry`. There is also a less obvious problem:
the installed Amplify custom-operation generator ignores `options.selectionSet`
for model-valued custom operations and generates the default complete model
selection, including `owner`. A regression test runs the installed generator and
reproduces this behavior. Simply deleting the field from the options is insufficient.

The guarded Lambda used the result of its IAM generated Entry create/update as the
custom mutation result. The generated model response redacts the owner, leaving
the custom Entry field resolver without its ownership source. This reproduces the
authorization failure at `createSeasonEntry.owner` / `updateSeasonEntry.owner`.
The actual browser network trace for the originally reported page visit was not
provided; that visit's individual operation cannot be identified from the message
alone. The previous list/get selection also requested the same protected field.

Read-only staging checks during this implementation found two existing r2 entries:
both stored owners matched actual Cognito subjects, both profile links matched
those owners, and both users belonged only to `player`. The eleven August entries
are separate. No identity mismatch or missing approval was found in those records.

The fix uses explicit GraphQL selections for the same existing guarded mutations,
omits `owner` from frontend reads, and re-reads the persisted Entry in the Lambda
before returning it. Player list lookups use `entriesByOwner` with an exact season
sort-key condition; private by-ID reads still use the base record and private
field authorization, avoiding secondary-index delay immediately after creation.
Both hydration and pick saves also check the selected season. Backend ownership
always comes from the authenticated Cognito subject and stored Entry, never a
client owner/username or an entry name. Public leaderboard Entry fields remain
readable under their existing rules; private fields and picks remain protected.

## Generated names and existing records

The application username is `UserProfile.username`, with its existing canonical
lowercase lookup value in `UserProfile.usernameKey`. It is not the email address,
Cognito's opaque login username, or an unverified request value.

For a new entry, the Lambda loads the profile by the authenticated `sub`, requires
exactly one owned profile, checks the existing 3-20 character ASCII username
convention and matching lowercase key, then constructs:

    {UserProfile.usernameKey}_picks_{Season.year}

For example, `Jake` / `jake` in season year 2026 becomes `jake_picks_2026`.
The year is loaded from the selected stored Season, not the clock. Names are
bounded and safe for the required string fields. They are not uniqueness or
authorization keys.

The optional profile ID is only a consistency check against that owned profile.
The legacy `entryName` create argument becomes optional and is ignored; the
existing optional update name argument is also ignored. This keeps cached callers
compatible without allowing player renames. Required stored name fields and all
existing entry labels remain intact; no migration is performed.

Creation checks the existing server window, uses the existing deterministic
owner/season/generation ID, and returns an existing active entry on retry. Concurrent
creates contend on that same ID; a conditional conflict may return only the matching
persisted, non-deleted entry. Multiple existing active entries remain a reviewed
legacy condition and are never overwritten or deleted.

## Player UI

Only a successful, current account/season entry load can expose the new-entry
action. Errors show their actual message and Retry instead of pretending the list
is empty. Stale account/season load responses are ignored. Creation stays explicit;
rendering the page never creates an entry. Existing users go straight to their
selections. The existing single-flight guard handles repeated clicks.

The first-time state says Create Your Entry and shows the eligible game count,
deadline reminder, and one Start Making Picks action. The name and rename inputs
are removed. Automatic names are not shown as redundant headings in the picks
workspace/locked view or dashboard entry card. The leaderboard snapshot keeps the
player username and removes its redundant entry-name column. Ranking, payout,
podium and selection counters are unchanged. The existing autosave coordinator
remains in place; pick save confirmation and bulk reconciliation were tightened
in the persistence follow-up below.

The requested dashboard sentence beginning "Make sure your pick set is finished"
is removed, including its empty container.

## Local validation

Tests exercise owner/season-scoped reads, field errors versus empty results,
the actual Amplify index/custom operation generators, trusted profile/year naming,
spoofed values, repeat/concurrent creates, legacy entries, opening/deadline checks,
cross-owner writes, real first-entry/error component rendering, and existing pick
save/change/clear/reload/progress/partial-save behavior. Offline synthesis verifies
the actual generated Entry owner authorization and redaction templates plus the
guarded Lambda arguments and dispatch payloads.

The test harness uses file URLs for external MUI modules on Windows. This changes
test loading only; registration and approval behavior is unchanged.

Changed files for this fix:

- Backend: `leaderboard/amplify/data/resource.ts`,
  `leaderboard/amplify/data/secure-picks/handler.js`, and
  `leaderboard/amplify/data/secure-picks/rules.mjs`.
- Player data/state: `leaderboard/src/data/entryRepository.js`,
  `leaderboard/src/data/picksRepository.js`, and
  `leaderboard/src/app/AppDataContext.jsx`.
- Picks UI: `leaderboard/src/components/picks/EntryStartState.jsx`,
  `PicksWorkspace.jsx`, and `LockedPicksView.jsx` in that same directory.
- Dashboard naming/copy: `leaderboard/src/components/dashboard/EntriesCard.jsx`,
  `LeaderboardCard.jsx`, and `SeasonStatusPanel.jsx`.
- Leaderboard name fallback: `leaderboard/src/utils/leaderboardScoring.js`.
- Regressions: the corresponding Entry/Pick repository tests,
  `leaderboard/src/components/picks/entryStartState.test.mjs`,
  `leaderboard/src/app/singlePickSetWorkflow.test.js`,
  `leaderboard/src/utils/leaderboardScoring.test.js`,
  `leaderboard/amplify/data/secure-picks/contract.test.mjs`, and
  `leaderboard/scripts/tests/secure-picks-resolver-contract.mjs`.
- Test registration/portability: `leaderboard/package.json` and the one-line
  Windows file-URL fix in `leaderboard/amplify/data/registration-admin/contract.test.mjs`.
- This report.

The pre-existing local schema-hash change in
`leaderboard/scripts/test26/target.mjs` belongs to the earlier seed preparation
and was not changed by this fix.

Run the required full validation from `leaderboard`:

    npm run preflight:gen2

This runs clean dependency installation, all automated tests, both TypeScript
checks, offline backend synthesis/Lambda bundling and resolver contract replay,
the frontend build, and Git whitespace checks. The session report records the
final results. Local tests do not replace authenticated staging validation.

## Deployment and staging validation

A backend AND frontend deployment is required because createSeasonEntry.entryName
changes from required to optional and the secure-picks Lambda changes. No model
field or authorization rule changes, migration, seed, reset, or date changes are
needed. Keep the existing staging-only active-season override `test26-r2`.

After explicit commit/push/deploy approval, use the established `gen2-updates`
Amplify pipeline. Let it deploy the backend before the frontend, and refresh
browser tabs after completion. Any changed seed introspection hash must be
verified and rebaselined through the existing guard workflow; never bypass it.

1. With a newly approved staging player and completed profile, open My Picks.
   Verify no authorization error, no name input, and the 48-game start state.
2. Click Start Making Picks. Confirm one Entry with the authenticated subject,
   correct profile, season `test26-r2`, and canonical `_picks_2026` name.
   Repeat clicks and refresh; verify the same entry ID and no duplicates.
3. Pick a team, wait for Saved to account, refresh, and sign out/in. Query the
   player's records and compare UI selections, ownership, and progress. Clear and
   reselect a game; confirm one deterministic Pick record per entry/game.
4. Use a second approved player. Verify a separate entry, no pre-kickoff access
   to the other player's private fields/picks, and denied cross-owner writes.
5. Simulate a failed entry read in browser network tooling. Confirm an error
   and Retry with no create action. Restore the network and retry successfully.
6. Check an existing entry and its picks without renaming it. Verify the August
   `test26` data remains untouched and is not selected by the r2 player lookup.
7. At the real November 4, 2026 8 PM CST deadline, verify UI locking and direct
   guarded create/update/pick rejection. Do not change clocks or stored dates.

## Pick persistence and schedule follow-up

The generated `createPick` data resolver issues DynamoDB `PutItem` with the
primary-key condition `id.attributeExists = false` (equivalent to
`attribute_not_exists(id)`). `updatePick` issues `UpdateItem` with
`id.attributeExists = true` (equivalent to `attribute_exists(id)`). There is no
client version field in `saveSeasonPick`. Previously the Lambda chose create or
update using `pickByEntryAndGame`, an eventually consistent secondary index.
If that index omitted a recent Pick, a second create used the same deterministic
ID and failed the create condition. The new path checks the primary ID, verifies
ownership/season/game, and recovers a conditional create conflict by re-reading
and updating the verified record. Both generated conditions remain intact.
When both eventual reads miss during a clear, the Lambda uses a generated
`updatePick` with atomic owner, entry, season and game conditions. A successful
update confirms the clear; a failed key-existence condition confirms that no
deterministic Pick needed clearing. It never acknowledges the reads alone.
The local contract reproduces this failure mode. The specific staging failure
event and existing Pick attributes could not be inspected because no AWS CLI
credentials are available in this environment; confirm them from staging logs
after deployment.

Clear All shared the index race and also trusted an immediate post-write index
read. That stale read could restore cleared selections and still lead to a
success notification. The client now sends clears for selections known to the
current draft, confirms the returned game and selection for each mutation,
builds its result from confirmed mutation responses, and requires the bulk result
to match every requested eligible game before showing success. A partial failure
remains an error with confirmed changes reconciled. Null pick pages fail closed.
Edited game IDs remain on the queued draft until confirmed. This forces the
latest selection through `saveSeasonPick` even when an older index value happens
to equal it (for example A, then B in flight, then A again). The existing
per-entry autosave coordinator serializes those requests.

The frontend's old one-page `Game.list` with a season filter ignored `nextToken`.
With both test seasons stored, a filtered first page could expose only 43 of the
48 eligible r2 games. The player query now uses the season index and consumes
every page. The preserved seed plan has 54 r2 games; six FCS games (numbers
2, 4, 5, 17, 18, 51) are excluded. The guarded pick mutation also rejects
those non-pickable games. My Picks now groups and labels its games and kickoff times
using `America/Chicago`, so fixtures crossing local midnight appear under the
right date. No fixture records or dates were changed.

Focused regressions cover primary-key conflict recovery, index lag on update
and clear, absent-pick clear, false-success rejection, partial failure, paginated
54-game loading, six exclusions, and the local date boundary. The full preflight
result is recorded in the engineering report returned to the requester.
