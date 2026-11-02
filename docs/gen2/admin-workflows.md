# Admin workflows

[Index](README.md)

## Access and separation

Admins use the `admin` Cognito group and the separate `AdminLayout`.
`AuthenticatedApp` redirects them to `/admin/entries` from player routes.
Player entry/pick mutations explicitly reject identities containing `admin`.
Admins retain privileged generated model operations for operational corrections.

Group authorization is the backend boundary. UI route checks and the
`isTestSeason` flag govern presentation and intended workflows, not the full
scope of an administrator's underlying model permissions.

## Entries and payments

[AdminEntriesPage](../../leaderboard/src/pages/AdminEntriesPage.jsx) uses
[adminEntriesRepository.js](../../leaderboard/src/data/adminEntriesRepository.js)
to load all Entry and Pick pages for the selected season. It applies canonical
entry selection, excludes soft-deleted entries, and shows player identity,
email, payment, and completed-versus-required picks.

Payment edits call `Entry.update` with `id` and `paymentStatus` using user-pool
auth. Supported schema values are unpaid, paid, waived, and refunded.

The current repository does **not** automatically write `paidAt` or create an
`AdminAction` when payment status changes. The audit model's existence must not
be described as complete auditing of every admin operation.

## Test-season games

[AdminGamesPage](../../leaderboard/src/pages/AdminGamesPage.jsx),
[adminGamesRepository.js](../../leaderboard/src/data/adminGamesRepository.js),
and [adminGameManagement.js](../../leaderboard/src/utils/adminGameManagement.js)
provide management of stored test-season games.

- The feature is enabled only when selected `season.isTestSeason === true`.
- Editable data includes bowl name, kickoff, network, venue/location, game
  status, scores, and in-progress status detail.
- Statuses are scheduled, in progress, final, or canceled.
- Final games require valid non-negative integer scores and a non-tied winner.
- The update helper derives `winnerTeam` from final scores and team abbreviations.
  Non-final games clear the derived winner; non-live games clear live detail.
- An unconfirmed update produces an error instead of a silent successful state.

These tools support simulation of scheduled → live → final and standings
updates. They are not a production ESPN ingestion pipeline. The schema permits
admin Game operations generally; test-season gating is currently a UI policy.

## Approvals

[AdminRegistrationsPage](../../leaderboard/src/pages/AdminRegistrationsPage.jsx)
lists confirmed, email-verified accounts awaiting group approval. Approval adds
only `player` and is independent of season lifecycle or game management.

See [authentication and registration](authentication-and-registration.md) for
the service rules and IAM actions, and the existing
[staging plan](../backend/gen2-registration-season-pending.md) for live checks.

## Future admin work

Keep audit logging, reason capture, payment timestamps, privileged pick
corrections, and production schedule management explicit in future designs.
The schema provides some supporting fields but does not implement every workflow.
Inspect legacy duplicate entries in raw admin data before any cleanup decision;
the canonical admin page intentionally shows the same effective entries used
by player standings.
