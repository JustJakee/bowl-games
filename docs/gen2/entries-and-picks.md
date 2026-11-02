# Entries, draft picks, and privacy

[Index](README.md)

## One active entry per player and season

The schema retains Entry/Pick relationships that can represent older multiple
entries. The current product exposes one canonical entry per player/season.

[canonicalEntry.js](../../leaderboard/src/data/canonicalEntry.js) excludes
soft-deleted records, chooses by latest pick/entry activity, then uses stable
timestamp/ID tie-breaks. Cross-player lists group by profile identity, then owner;
unlinked legacy records stay separate. Existing duplicates remain in storage.

[entryRepository.js](../../leaderboard/src/data/entryRepository.js) handles
normalization, owner/season loading, create-or-load behavior, updates, and soft
deletion. Creation uses a single-flight path in the app to prevent duplicate UI
requests. The backend additionally checks for an active entry and uses an ID
based on season, owner, and existing-record count so competing creates contend
on the same ID.

Soft deletion sets `isDeleted=true`; it does not erase Entry or Pick records.
Creating or editing competition entries is blocked for administrator identities.

## Draft persistence

- [AppDataContext](../../leaderboard/src/app/AppDataContext.jsx) owns player entry
  state, loading, saves, and reconciliation.
- [PicksWorkspace](../../leaderboard/src/components/picks/PicksWorkspace.jsx)
  manages draft presentation, browser draft recovery, autosave, and locked views.
- [picksRepository.js](../../leaderboard/src/data/picksRepository.js) loads all
  pick pages, validates selections, saves only changed picks, and persists
  tiebreaker/entry changes through guarded operations.
- Incomplete selections remain resumable drafts. Completion is derived from
  required picks and the tiebreaker; a saved draft is not automatically complete.
- Deselection persists an empty selected-team value through `saveSeasonPick`.
  Clearing a nonexistent pick is a no-op; clearing an existing pick updates it.
- Deterministic pick IDs reduce duplicate creation. Conflicting persisted
  ownership or multiple records for the same entry/game cause explicit errors.
- Autosave coordination serializes work per entry and tracks revisions so an
  older response cannot erase a newer edit. Pending work can be canceled.
- Pick-loading helpers avoid showing stale selections during entry changes.
- Multi-pick saves are not atomic. Errors retain completed changes and attempt
  a backend reload to reconcile partial success. The UI must not report the
  entire draft saved merely because some requests succeeded.

Autosave helpers and tests live under `src/components/picks/`; workflow tests
also live in `src/app/singlePickSetWorkflow.test.js`.

## Server-enforced write rules

The custom Lambda dispatch uses top-level `event.fieldName`, as emitted by the
generated AppSync resolver. See the [secure-picks dispatch regression](../backend/gen2-secure-picks-dispatch-fix.md)
for the four affected operations, generated-payload replay tests, and combined
staging verification requirements.

[secure-picks/rules.mjs](../../leaderboard/amplify/data/secure-picks/rules.mjs)
and [handler.js](../../leaderboard/amplify/data/secure-picks/handler.js) enforce:

1. The caller has a Cognito `sub`, belongs to `player`, and is not an admin.
2. The persisted entry belongs to that subject, matches the season, and is not
   soft-deleted. Supplied profile linkage must also belong to the caller.
3. The season is active and stored status is `open`.
4. Exactly one season configuration is loaded; valid timing and games exist.
5. Server time is at or after `picksOpenAt` and **strictly before the earlier of
   `picksLockAt` and the earliest game kickoff**.
6. The selected game belongs to the season and is still `scheduled`.
7. A nonempty selection matches one of the game's team abbreviations.

The service derives owner/season from verified identity and persisted data.
Players cannot supply an arbitrary owner or bypass checks with generated model
mutations. Entry edits, tiebreaker edits, and soft deletes share the deadline.
The server checks time again immediately before writes, but the check and write
are separate requests; the exact-boundary race is documented as remaining work.

## Visibility after kickoff

Raw Pick reads are owner-only for players, and Pick subscriptions are disabled.
`visibleSeasonPicks` supplies a safe projection for standings and schedule splits:

- The owner can see their own selections before kickoff.
- Another player's selection is revealed only at/after that game's scheduled
  kickoff, independently of the season-wide editing deadline.
- Soft-deleted entries are excluded.
- `completeEntryIds` and per-game `submissionCounts` support progress displays
  without disclosing pre-kickoff team choices.
- Other players' tiebreaker values are revealed after the championship kickoff;
  the championship is currently matched by its exact bowl name.
- Private owner/contact/payment fields are not included in the visible-pick DTO.

Keep [leaderboardRepository](../../leaderboard/src/data/leaderboardRepository.js)
and [gamePickSplitsRepository](../../leaderboard/src/data/gamePickSplitsRepository.js)
on this guarded read path. Removing a UI label or filter is not a privacy fix.
