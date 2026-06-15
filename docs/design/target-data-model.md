# Target Data Model

## Design goals

- Replace the current single `Submission` model with durable entities that separate identity, season state, entries, picks, admin activity, and legacy archive data.
- Preserve public leaderboard visibility while keeping emails, payment status, and admin-only data private.
- Support one account owning multiple entries.
- Preserve historical Gen 1 submissions as view-only archive records.
- Stop keying picks by bowl display name. All new picks should reference durable `Game.id` values.

## Proposed entity map

- `UserProfile`
- `Season`
- `Game`
- `Entry`
- `Pick`
- `AdminAction`
- `ArchivedSubmission`
- `AppConfig` or `SeasonConfig` (recommended)

## UserProfile

### Purpose

Represents the application-level profile for one Cognito-backed user. This is the owner record for player-created entries and the main place for private account metadata.

### Proposed fields

- `id: ID!`
- `ownerSub: String!`
  - Cognito `sub`; durable owner identifier
- `email: AWSEmail!`
- `displayName: String!`
- `status: UserStatus!`
  - Suggested values: `ACTIVE`, `DISABLED`
- `role: UserRole`
  - Optional denormalized helper; source of truth should still be Cognito groups
- `createdAt: AWSDateTime!`
- `updatedAt: AWSDateTime!`
- `lastLoginAt: AWSDateTime`
  - Optional; useful if later added through app logic

### Relationships

- One `UserProfile` belongs to one Cognito user.
- One `UserProfile` can own many `Entry` records.
- `AdminAction.actorUserProfileId` can reference a `UserProfile`.

### Access rules

- Public: no access.
- Authenticated player:
  - can read and update their own profile
  - cannot read other users' emails or internal status
- Admin:
  - can read all profiles
  - can update selected fields through audited admin flows

### Notes for Amplify Gen 2

- Use owner-based auth tied to Cognito identity for player self-access.
- Add admin group-based read/write access for admin tooling.
- Keep `email` private; do not expose `UserProfile` directly in public leaderboard queries.

### Migration notes from `Submission`

- No current `Submission` row maps cleanly to a real user account.
- Historical submissions should not auto-create claimable `UserProfile` ownership.
- User profiles should begin with new auth rollout, not by backfilling legacy names/emails as trusted identities.

## Season

### Purpose

Represents one bowl season and the rules/window for entries, locks, public visibility, and scoring.

### Proposed fields

- `id: ID!`
- `slug: String!`
  - Example: `2026-bowls`
- `label: String!`
  - Example: `Bowl Season 2026`
- `year: Int!`
- `status: SeasonStatus!`
  - Suggested values: `PLANNING`, `OPEN`, `LOCKED`, `LIVE`, `FINAL`, `ARCHIVED`
- `entryFeeUsd: Int`
  - store cents if exact money handling is preferred; if so rename to `entryFeeCents`
- `entryOpenAt: AWSDateTime`
- `entryLockAt: AWSDateTime`
  - canonical lock timestamp if lock is season-wide
- `firstGameAt: AWSDateTime`
- `publicLeaderboardVisible: Boolean!`
- `publicAllPicksVisible: Boolean!`
- `notes: String`
- `createdAt: AWSDateTime!`
- `updatedAt: AWSDateTime!`

### Relationships

- One `Season` has many `Game` records.
- One `Season` has many `Entry` records.
- One `Season` can have one `SeasonConfig` if split out.

### Access rules

- Public:
  - can read limited season state needed for public pages
- Authenticated player:
  - can read active season state
- Admin:
  - full read/write

### Notes for Amplify Gen 2

- Keep public-facing fields queryable without exposing internal configuration.
- If field-level auth is awkward, split operational settings into `SeasonConfig`.

### Migration notes from `Submission`

- The current app hardcodes season flags in frontend state. Those should move to backend-managed season state.

## Game

### Purpose

Represents one bowl matchup in a season with durable identifiers, schedule state, and result data used for pick locking and scoring.

### Proposed fields

- `id: ID!`
  - app-controlled durable game ID
- `seasonId: ID!`
- `externalGameId: String`
  - ESPN event ID if available
- `slug: String!`
- `bowlName: String!`
- `displayName: String!`
- `awayTeamCode: String!`
- `awayTeamName: String!`
- `homeTeamCode: String!`
- `homeTeamName: String!`
- `kickoffAt: AWSDateTime!`
- `network: String`
- `location: String`
- `status: GameStatus!`
  - Suggested values: `SCHEDULED`, `LIVE`, `FINAL`, `CANCELED`
- `winningTeamCode: String`
- `awayScore: Int`
- `homeScore: Int`
- `isTieBreakerGame: Boolean!`
- `sortOrder: Int!`
- `createdAt: AWSDateTime!`
- `updatedAt: AWSDateTime!`

### Relationships

- One `Game` belongs to one `Season`.
- One `Game` has many `Pick` records.

### Access rules

- Public: read
- Authenticated player: read
- Admin: full read/write or controlled sync/update access

### Notes for Amplify Gen 2

- Store a stable internal `id` even if ESPN IDs change or external integration is replaced.
- `sortOrder` should drive pick form and CSV/export order rather than depending on JSON key order.

### Migration notes from `Submission`

- Legacy `Submission.picks` use bowl names as JSON keys. Archive them as-is.
- New `Pick` rows must point to `gameId`, never to bowl display text alone.

## Entry

### Purpose

Represents one bracket/entry submitted by a player for a specific season.

### Proposed fields

- `id: ID!`
- `seasonId: ID!`
- `ownerUserProfileId: ID!`
- `entryName: String!`
- `contactEmail: AWSEmail!`
  - snapshot for operations; keep private
- `status: EntryStatus!`
  - Suggested values: `DRAFT`, `SUBMITTED`, `LOCKED`, `FINAL`, `ARCHIVED`, `DELETED`
- `paymentStatus: PaymentStatus!`
  - Suggested values: `UNPAID`, `PAID`, `WAIVED`, `REFUNDED`
- `tieBreakerPrediction: Int`
- `submittedAt: AWSDateTime`
- `lockedAt: AWSDateTime`
- `isDeleted: Boolean!`
- `deletedAt: AWSDateTime`
- `deletedReason: String`
- `createdAt: AWSDateTime!`
- `updatedAt: AWSDateTime!`

### Relationships

- One `Entry` belongs to one `UserProfile`.
- One `Entry` belongs to one `Season`.
- One `Entry` has many `Pick` records.
- One `Entry` can be the target of many `AdminAction` records.

### Access rules

- Public:
  - can read only public leaderboard fields through curated queries/views
  - should not read raw entry email or payment fields
- Authenticated player:
  - can create entries they own
  - can read their own entries
  - can update their own entries until lock
- Admin:
  - can read and manage all entries
  - edits after lock must go through audited correction flow

### Notes for Amplify Gen 2

- Separate public leaderboard queries from raw entry reads.
- Consider making `paymentStatus` admin-only through field-level auth or admin-only resolver paths.
- `contactEmail` may mirror `UserProfile.email` initially but should remain editable through admin correction flow for cleanup.

### Migration notes from `Submission`

- Current `Submission.name` maps conceptually to `Entry.entryName`.
- Current `Submission.email` maps conceptually to `Entry.contactEmail`.
- Current `Submission.tieBreaker` maps to `Entry.tieBreakerPrediction`.
- Historical `Submission` rows should move into `ArchivedSubmission`, not `Entry`, because they are not account-owned.

## Pick

### Purpose

Represents one entry's selection for one game.

### Proposed fields

- `id: ID!`
- `entryId: ID!`
- `gameId: ID!`
- `selectedTeamCode: String!`
- `selectedTeamName: String`
  - optional snapshot for easier audit/history
- `status: PickStatus`
  - Suggested values: `PENDING`, `CORRECT`, `INCORRECT`, `VOID`
- `source: PickSource!`
  - Suggested values: `PLAYER`, `ADMIN_OVERRIDE`, `MIGRATED`
- `createdAt: AWSDateTime!`
- `updatedAt: AWSDateTime!`

### Relationships

- One `Pick` belongs to one `Entry`.
- One `Pick` belongs to one `Game`.
- `AdminAction` can target a `Pick`.

### Access rules

- Public:
  - read only if public all-picks or leaderboard view intentionally exposes it
- Authenticated player:
  - create/update their own picks through their own entries until lock
- Admin:
  - full read
  - write only through corrected operational flow after lock

### Notes for Amplify Gen 2

- Enforce uniqueness on `(entryId, gameId)` at the application layer or with a composite key/index pattern.
- Scoring can remain computed at read time initially to keep costs low.

### Migration notes from `Submission`

- Legacy pick blobs should not be split into live `Pick` rows unless there is a clear need to normalize archived history.
- If legacy normalization is ever needed, bowl-name-to-game mapping will require a one-time migration table and manual review for duplicates.

## AdminAction

### Purpose

Immutable audit log for admin-only corrections and operational interventions.

### Proposed fields

- `id: ID!`
- `actorUserProfileId: ID`
- `actorCognitoSub: String!`
- `actorDisplayName: String`
- `actionType: AdminActionType!`
  - Examples: `UPDATE_ENTRY`, `UPDATE_PICK`, `UPDATE_PAYMENT_STATUS`, `DELETE_ENTRY`, `RESTORE_ENTRY`
- `targetType: AdminTargetType!`
  - Examples: `USER_PROFILE`, `ENTRY`, `PICK`, `SEASON`, `GAME`
- `targetId: ID!`
- `seasonId: ID`
- `entryId: ID`
- `reason: String!`
- `beforeValueJson: AWSJSON`
- `afterValueJson: AWSJSON`
- `metadataJson: AWSJSON`
- `createdAt: AWSDateTime!`

### Relationships

- Many `AdminAction` rows can reference one target record.
- May reference `UserProfile`, `Entry`, `Pick`, `Game`, or `Season`.

### Access rules

- Public: no access
- Authenticated player: no access
- Admin: read/write

### Notes for Amplify Gen 2

- Treat this model as append-only.
- Prefer service-layer mutations that write the target record and the `AdminAction` record together.
- `beforeValueJson` and `afterValueJson` should store only the fields changed plus enough context to review the correction.

### Migration notes from `Submission`

- No migration from old data required.
- This begins with the new admin correction system.

## ArchivedSubmission

### Purpose

Stores legacy Gen 1 `Submission` records as historical, view-only archive data that remains public where intended but is not claimable by default.

### Proposed fields

- `id: ID!`
- `legacySubmissionId: String`
- `legacySeasonLabel: String!`
- `entryName: String!`
- `contactEmail: AWSEmail`
  - private/admin only
- `picksJson: AWSJSON`
- `tieBreakerPrediction: Int`
- `originalCreatedAt: AWSDateTime`
- `importedAt: AWSDateTime!`
- `archiveStatus: ArchiveStatus!`
  - Suggested values: `VISIBLE`, `HIDDEN`
- `notes: String`

### Relationships

- No ownership relationship by default.
- Optional future relationship to `Season` if archived seasons are modeled in the same table family.

### Access rules

- Public:
  - may read archived display names, picks, and public standings if that view is exposed
  - cannot read archived emails
- Authenticated player:
  - same public archive visibility as visitors
  - no default claim/edit rights
- Admin:
  - full read
  - limited corrective writes if archive cleanup is ever needed

### Notes for Amplify Gen 2

- Keep this separate from live `Entry` data to avoid accidental owner assumptions.
- Field-level auth should hide `contactEmail` from non-admin users.

### Migration notes from `Submission`

- This is the direct destination for existing Gen 1 `Submission` rows.
- Preserve original JSON and timestamps as source-of-truth archive data.
- Do not auto-link archived records to `UserProfile`.

## AppConfig or SeasonConfig

### Purpose

Provides operational settings without hardcoding flags in the frontend. This replaces values like `isBowlSeason`, `picksClosed`, entry fee copy, and public visibility toggles.

### Proposed fields

If using `SeasonConfig`:

- `id: ID!`
- `seasonId: ID!`
- `publicSiteMode: PublicSiteMode!`
  - Suggested values: `OFFSEASON`, `PRESEASON`, `LIVE`, `ARCHIVE`
- `allowEntryCreation: Boolean!`
- `allowEntryEditingBeforeLock: Boolean!`
- `showAllPicksPublicly: Boolean!`
- `showLeaderboardPublicly: Boolean!`
- `entryFeeDisplayText: String`
- `supportContactText: String`
- `updatedAt: AWSDateTime!`

If using global `AppConfig`:

- `id: ID!`
- `activeSeasonId: ID`
- `supportContactText: String`
- `updatedAt: AWSDateTime!`

### Relationships

- `SeasonConfig` belongs to one `Season`.
- `AppConfig.activeSeasonId` may point to `Season`.

### Access rules

- Public:
  - read only the subset needed for public rendering
- Authenticated player:
  - same as public plus player-specific flags if needed
- Admin:
  - full read/write

### Notes for Amplify Gen 2

- Prefer `SeasonConfig` if most flags vary by year.
- Keep mutable operational switches out of frontend constants.

### Migration notes from `Submission`

- No direct migration from `Submission`.
- Replaces current frontend hardcoded flags and static fee copy patterns.

## Recommended relationship summary

- One Cognito user -> one `UserProfile`
- One `UserProfile` -> many `Entry`
- One `Season` -> many `Game`
- One `Season` -> many `Entry`
- One `Entry` -> many `Pick`
- One `Pick` -> one `Game`
- Many `AdminAction` -> one target record
- `ArchivedSubmission` remains separate from live ownership model

## Implementation notes for Amplify Gen 2

- Prefer public read paths that return curated leaderboard/archive projections rather than broad public model reads.
- Keep admin-only fields off public query surfaces.
- Use durable IDs and explicit foreign keys instead of serialized JSON blobs for live picks.
- Avoid deriving lock behavior from frontend-only flags. Lock logic should come from season/game state in backend-backed config.
- Keep scoring computed initially unless cost or query complexity forces materialized standings later.

## Migration notes from the old `Submission` model

- Current model:
  - `name`
  - `email`
  - `picks` as `AWSJSON`
  - `tieBreaker`
  - `createdAt`
- Target migration stance:
  - preserve old rows as `ArchivedSubmission`
  - do not auto-convert old rows into account-owned live entries
  - do not auto-claim legacy rows to new users
  - treat archive data as immutable historical record by default

## Unknowns

- Whether archived seasons need full normalized `Game` and `Pick` history or only raw archived submissions.
- Whether payment amounts should be stored as cents instead of whole dollars for future flexibility.
- Whether user display names should be globally unique, season-unique, or entry-unique only.
