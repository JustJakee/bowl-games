# Admin Corrections

## Purpose

This document defines the target admin "oops fix" workflow for Bobs Bowl Games. The goal is to let admins correct mistakes without weakening player ownership or hiding the fact that a correction happened.

## Scope of the admin dashboard

Recommended first-pass dashboard scope:

- User lookup
- Entry lookup
- Entry detail view
- Pick detail view
- Payment status management
- Lock status visibility
- Archived submission lookup
- Admin action history

Recommended search keys:

- entry name
- user display name
- contact email
- season
- entry ID

## Recommended first-version admin permissions

Admins can:

- read all users, entries, picks, payment status, archived submissions, and admin actions
- update entries and picks through audited correction flows
- soft-delete and restore entries
- hide and restore archived submissions
- export entry/contact/payment data

Admins cannot:

- permanently delete `AdminAction` records
- silently edit locked picks
- edit another admin's audit reason after creation
- impersonate a player in v1

## What admins can correct

- Player display name
- Entry contact email
- Payment status
- Entry tie-breaker
- Picks before lock
- Picks after lock through override flow
- Duplicate/test entries
- Limited season/config mistakes if exposed in admin tools

## What must require a reason

Every admin write should require a reason. At minimum:

- changing display name
- changing contact email
- changing payment status
- changing tie-breaker
- changing any pick
- deleting an entry
- restoring a deleted entry

Reason rules:

- free-text required
- minimum length recommended, for example 10 characters
- should describe what happened, not just `fix`

## Audit record requirements

Each admin write must create an `AdminAction` record with:

- actor identity
- target type
- target ID
- season ID when relevant
- entry ID when relevant
- action type
- reason
- before value
- after value
- timestamp

## Before and after value storage

Recommended approach:

- Store only the fields changed plus enough identifiers to review the change.
- Use JSON payloads in `beforeValueJson` and `afterValueJson`.

Examples:

- display name fix:
  - before: `{ "displayName": "Jake K" }`
  - after: `{ "displayName": "Jake Koons" }`
- post-lock pick override:
  - before: `{ "entryId": "E1", "gameId": "G12", "selectedTeamCode": "BAMA" }`
  - after: `{ "entryId": "E1", "gameId": "G12", "selectedTeamCode": "MICH" }`

Do not store secrets or unnecessary sensitive payloads in audit blobs.

## Admin visibility of changes

Other admins should be able to see:

- the current corrected value
- that a correction happened
- who made it
- when it happened
- why it happened

Recommended UI:

- an activity panel on entry detail pages
- an admin history table filterable by season, actor, action type, and target

## Guardrails to prevent accidental changes

- reason field required before save
- confirmation step for destructive or post-lock actions
- highlight when target entry is locked
- render before/after diff preview before submit
- disable bulk edit in first version
- soft-delete by default for entries
- clear labels when editing player-owned versus archived data
- show warning when editing fields visible on public leaderboard

## Hard delete vs soft delete

Recommended policy:

- `Entry`
  - soft-delete
  - keep record for audit and recovery
- `Pick`
  - normally update in place with audit trail; do not hard-delete individually unless there is a clear operational case
- `AdminAction`
  - never hard-delete through normal admin UI
- `ArchivedSubmission`
  - avoid hard-delete; prefer hide/unhide if archive cleanup is needed
- `UserProfile`
  - avoid delete in first version; disable instead

## Suggested UI flows

## Fix display name

Flow:

1. Admin opens entry or user detail.
2. Admin clicks `Edit display name`.
3. Current value is prefilled.
4. Admin enters new display name and required reason.
5. UI shows diff preview.
6. Admin confirms.
7. System updates target record and writes `AdminAction`.

Notes:

- If display name appears publicly, note that the change affects leaderboard/archive views immediately or after refresh.

## Fix contact email

Flow:

1. Admin opens entry or user detail.
2. Admin clicks `Edit contact email`.
3. UI requires new valid email and reason.
4. UI warns that email is private/admin-only data.
5. Admin confirms.
6. System writes change plus audit record.

Notes:

- If both `UserProfile.email` and `Entry.contactEmail` exist, UI should clearly state which field is being changed.

## Fix payment status

Flow:

1. Admin opens entry detail.
2. Admin changes payment status from a controlled enum.
3. Admin enters required reason.
4. UI shows current and next state.
5. Admin confirms.
6. System writes change plus audit record.

Notes:

- Prefer enum values over freeform text.

## Fix tie-breaker

Flow:

1. Admin opens entry detail.
2. Admin clicks `Edit tie-breaker`.
3. UI validates numeric input.
4. Admin enters reason.
5. UI shows diff preview.
6. Admin confirms.
7. System updates entry and writes `AdminAction`.

## Fix a pick before lock

Flow:

1. Admin opens entry detail and selects a game row.
2. UI shows current pick and game lock status.
3. Since entry is still unlocked, UI labels this as a standard correction.
4. Admin selects replacement team and enters reason.
5. UI confirms.
6. System updates pick and writes `AdminAction`.

Notes:

- Even before lock, admin edits should still be audited.

## Override a pick after lock

Flow:

1. Admin opens a locked entry.
2. UI clearly marks the entry as locked.
3. Admin selects `Override locked pick`.
4. UI warns that this is a post-lock audited correction.
5. Admin chooses the replacement team and enters a detailed reason.
6. UI shows before/after diff and confirmation.
7. System writes pick update plus `AdminAction`.
8. Entry activity timeline shows the override immediately.

Notes:

- This should use a dedicated override path, not the normal player edit path.

## Delete duplicate or test entry

Flow:

1. Admin opens entry detail.
2. Admin selects `Delete entry`.
3. UI explains this is a soft-delete and will hide the entry from normal views.
4. Admin must enter reason.
5. UI requires confirmation.
6. System marks the entry deleted and writes `AdminAction`.

Notes:

- Add `Restore entry` in the same admin area.

## Recommended admin dashboard views

- `Entries`
  - search, season filter, locked/unlocked filter, payment filter
- `Entry detail`
  - entry metadata, picks table, correction actions, audit timeline
- `Users`
  - profile view and owned entries
- `Archive`
  - historical legacy submissions
- `Admin history`
  - all `AdminAction` rows

## Operational notes

- Admin corrections should be visible to other admins immediately after write.
- Public users do not need to see full admin reasons or raw audit records.
- If a correction materially changes public results, the entry detail page for admins should show that a public-facing value changed.

## Unknowns

- Whether admins should be allowed to edit archived legacy submissions or only hide them.
- Whether payment notes need a separate private notes model in addition to status.
- Whether multi-step approval is needed for post-lock corrections in later versions.
