# Auth and Ownership Rules

## Design goals

- Introduce real account ownership without removing the public leaderboard.
- Keep player data private where required.
- Support one user owning multiple entries.
- Allow admins to fix mistakes, including post-lock corrections, with mandatory auditing.
- Keep authorization naming and logic consistent across Cognito, backend models, and frontend checks.

## Recommended Cognito groups

- `player`
- `admin`

Use lowercase group names consistently everywhere:

- Cognito group names
- backend auth rules
- frontend role checks
- admin UI feature flags

Do not mix `Admin`, `ADMIN`, and `admin`. Pick lowercase and keep it.

## Roles

- Public visitor
- Authenticated player
- Admin

## Ownership model

- Each Cognito user gets one `UserProfile`.
- Ownership is based on Cognito `sub`, not email and not display name.
- A `UserProfile` can own many `Entry` records.
- Each `Entry` belongs to exactly one `UserProfile`.
- Each `Pick` belongs to one `Entry` and inherits ownership through that entry.
- Legacy `ArchivedSubmission` records are not user-owned by default.

## Public visitor rules

### Allowed

- View public leaderboard data.
- View public display names.
- View public game/schedule/results data.
- View archived public history if that archive page is exposed.

### Not allowed

- View user emails.
- View payment status.
- View raw admin logs.
- View internal lock controls or admin-only notes.
- Create or edit entries.
- Create or edit picks.

## Authenticated player rules

### Allowed

- Read their own `UserProfile`.
- Update their own profile fields that the product permits.
- Create multiple entries they own.
- Read their own entries and picks.
- Create and edit picks for their own entries until lock.
- Save drafts for their own entries if draft mode is enabled.
- Submit entries before the lock deadline.

### Not allowed

- Edit other users' entries.
- Edit locked entries.
- Read private fields for other users.
- Read admin audit data.
- Perform admin override actions.

## Admin rules

### Allowed

- View and manage all users, entries, picks, payment status, and lock states.
- Correct locked entries through audited correction flows.
- Fix display names, contact emails, tie-breakers, payment status, and pick values.
- Delete duplicate or test entries according to deletion rules.
- View admin history for prior corrections.

### Required constraints

- Admin-only writes must create an `AdminAction` record.
- Each `AdminAction` must include:
  - reason
  - target type
  - target ID
  - before value
  - after value
  - timestamp
- Post-lock edits should only happen through explicit admin correction flows, not normal player mutations.

## Entity-level authorization intent

## UserProfile

- Public: no access
- Player:
  - read own
  - update own permitted fields
- Admin:
  - read all
  - update through admin tooling

## Season / Game / public config

- Public: read public-facing fields
- Player: read
- Admin: full read/write

## Entry

- Public:
  - no raw read by default unless using a curated public projection/query
- Player:
  - create own
  - read own
  - update own until lock
- Admin:
  - read all
  - update all
  - post-lock changes require `AdminAction`

## Pick

- Public:
  - no broad raw read by default unless using a curated public all-picks view
- Player:
  - create/update own via owned entries until lock
- Admin:
  - read all
  - update all
  - post-lock changes require `AdminAction`

## Payment status

- Public: no access
- Player:
  - optional read-own only if product wants players to see payment state
  - no write
- Admin:
  - full read/write

## AdminAction

- Public: no access
- Player: no access
- Admin: read/write

## ArchivedSubmission

- Public:
  - read only public archive fields
- Player:
  - same as public unless a separate private archive view is intentionally added
- Admin:
  - full read
  - limited corrective write if archive maintenance is allowed

## Locking rules

- Entry lock should be derived from backend season/game state, not from frontend-only booleans.
- Recommended rule:
  - a player can edit an entry until the first game lock for that season
- Optional future refinement:
  - if product later wants per-game rolling locks, `Pick` write rules can key off each `Game.kickoffAt`
- Admin after-lock behavior:
  - allowed only through audited correction flow
  - should not use the same write path as player self-service edits

## Public data boundary

Publicly visible:

- display names
- standings
- selected picks only if public all-picks remains a product feature and the season is locked
- game schedule/results
- archive display data

Private/admin-only:

- emails
- payment status
- user account identifiers
- admin notes
- admin action logs
- raw before/after correction payloads

## Public all-picks timing

Recommended rule:

- Before the season lock, public visitors and normal players should not see all submitted picks.
- After the season lock, public all-picks can be visible if the product wants that feature.
- Admins can view all picks before and after lock.
- The public all-picks surface must exclude emails, payment status, account IDs, admin notes, and audit data.

## Payment status visibility

Recommended rule:

- Public visitors cannot see payment status.
- Players can see payment status for their own entries.
- Players cannot edit payment status.
- Admins can view and update payment status through audited admin flows.

## AdminAction immutability

Recommended rule:

- `AdminAction` records are append-only.
- Admins can create `AdminAction` records through correction flows.
- Admins can read `AdminAction` history.
- Admins cannot normally update or delete `AdminAction` records.
- If an audit record is wrong, create a new corrective `AdminAction` instead of editing the old one.

## Recommended mutation boundaries

- Player self-service mutations:
  - create entry
  - update draft entry
  - submit entry
  - save or update pick before lock
- Admin mutations:
  - correct entry field
  - correct payment state
  - override pick after lock
  - soft-delete duplicate/test entry
  - restore soft-deleted entry

Admin mutations should be separate operations or resolver paths so the system can enforce mandatory audit logging.

## Admin mutation boundary

Recommended rule:

- Admin reads can use normal admin-authorized read access.
- Admin correction writes should use dedicated admin correction operations.
- Sensitive direct model updates should not be exposed to the admin UI if they can bypass audit logging.
- A correction should fail or be flagged if the target update succeeds but the `AdminAction` record cannot be created.

## Implementation notes for Amplify Gen 2

- Use owner-based access for player-owned models.
- Use group-based access for admin reads/writes.
- Avoid exposing private model fields in public reads; curated query surfaces are safer than broad model public access.
- Keep archived data separate from live owner-bound data so legacy records do not accidentally inherit account edit rights.

## Unknowns

- Whether players should see their own payment status in the first release.
- Whether public all-picks should remain available before lock, after lock, or both.
- Whether admins need a separate `super-admin` group later for operational or billing actions.
