# Data model and authorization

[Index](README.md) · Source: [data/resource.ts](../../leaderboard/amplify/data/resource.ts)

## Models

| Model | Purpose and important fields |
| --- | --- |
| `UserProfile` | Cognito `owner`, private email, username, normalized `usernameKey`, preferred group, entries |
| `Season` | Year, name, slug, lifecycle status, fee in cents, `isActive`, `isTestSeason` |
| `SeasonConfig` | Season link, `picksOpenAt`, `picksLockAt`, entry cap, tiebreaker settings, scoring JSON |
| `Game` | Season link, upstream event ID, ordering, team identities/branding, kickoff, venue/network, status, scores, winner |
| `Entry` | Season/player/profile link, display name and key, contact email, payment, tiebreaker, soft-delete and submission/lock timestamps |
| `Pick` | Season/entry/game links, owner, selected team, optional confidence/rank/result fields |
| `AdminAction` | Action and target, reason, before/after JSON, actor, timestamp |
| `ArchivedSubmission` | Legacy identity, season label, picks snapshot, score/tiebreaker and import provenance |

Relationships connect `Season` to config/games/entries/picks, `UserProfile` to
entries, and each `Pick` to its entry and game. Historical models and optional
fields do not imply that an import or scoring write service exists.

Enums:

- Season: `draft`, `open`, `locked`, `complete`, `archived`.
- Game: `scheduled`, `in_progress`, `final`, `canceled`.
- Payment: `unpaid`, `paid`, `waived`, `refunded`.

`isTestSeason` defaults to false. It is independent of `isActive`, lifecycle
status, and the pick deadline.

## Generated lookup indexes

| Model | Query fields |
| --- | --- |
| UserProfile | `userProfileByOwner`, `userProfileByUsernameKey` |
| Season | `seasonBySlug` |
| SeasonConfig | `seasonConfigBySeasonId` |
| Game | `gamesBySeason` with kickoff sort key |
| Entry | `entriesByOwner` with season sort key; `entriesBySeasonAndEntryNameKey` |
| Pick | `pickByEntryAndGame`, `picksByGame`, `picksBySeason` |

Indexes provide query paths; they are not uniqueness constraints. Important
repositories and backend services follow pagination tokens, but not every
season/game loader currently does. See [future work](future-development.md).

## Authorization contract

The default Data authorization mode is `userPool`; no public API-key mode is
defined for Gen 2. Group names are lowercase `player` and `admin`.

| Resource | Player/owner access | Admin access |
| --- | --- | --- |
| UserProfile | Players read public profile fields; matching owner can create/read/update their profile | Read/update/delete, subject to field rules |
| Season, SeasonConfig, Game | Approved players read | Full model operations |
| Entry | Approved players read safe fields; owner reads private fields; player writes use guarded operations | Full model operations, with field rules |
| Pick | Owner reads; no direct player writes; subscriptions disabled | Full enabled model operations |
| AdminAction | No player access | Create/read only; generated update/delete disabled |
| ArchivedSubmission | No player access | Full model operations |

Owner rules explicitly use Cognito `sub`. Entry owner, profile linkage, contact
email, payment fields, tiebreaker, and submission/lock timestamps have field-level
restrictions. Nullable protected fields support redaction; a missing payment
value is treated as unpaid in player presentation.

A confirmed account without a group can still access its own records where
owner rules permit it. Approval does not revoke those owner rules, but it gates
broad contest reads and the custom player operations.

## Custom API surface

| Operation | Group | Service |
| --- | --- | --- |
| `createSeasonEntry` | player | secure-picks |
| `updateSeasonEntry` | player | secure-picks |
| `saveSeasonPick` | player | secure-picks |
| `visibleSeasonPicks` | player | secure-picks |
| `listPendingRegistrations` | admin | registration-admin |
| `approveRegistration` | admin | registration-admin |

The secure write service also rejects identities containing `admin`, even if
they contain `player`. See [entries and picks](entries-and-picks.md) for deadline
and ownership checks and [registration](authentication-and-registration.md) for
the approval service's Cognito permissions.

When editing the schema, review both model and field rules, generated queries,
relationships, custom return types, function IAM access, and frontend selection
sets. Client-side hiding alone does not protect private data.
