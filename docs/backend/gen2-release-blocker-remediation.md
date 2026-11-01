# Gen 2 release blocker remediation

Scope: `gen2-updates` only. No AWS environment was accessed, seeded, reset, or deployed.

| Finding | Root cause | Local correction |
| --- | --- | --- |
| Player pick lock | Generated Pick mutations had owner authorization but no server deadline check. | Player model writes are denied. `saveSeasonPick` validates the persisted season, entry, game, `picksOpenAt`, and the earlier of `picksLockAt` or the first game kickoff using Lambda server time. Entry and tiebreaker changes use the same lock check. Admin model operations remain available. |
| Pre-kickoff privacy | An authenticated-read Pick rule exposed all selections through list, index, and relationship queries. | Pick model reads are owner-only; subscriptions are disabled. `visibleSeasonPicks` reveals another entry's selection only at or after that game's scheduled kickoff. It returns safe completion and submission aggregates so standings and splits still work. Entry tiebreakers are field-restricted and revealed through this query only after championship kickoff. |
| Pick ownership | Client-supplied `owner` and `entryId` were not checked against the persisted Entry. | `saveSeasonPick` obtains the owner from Cognito `sub` and checks the persisted Entry, season, and game before writing. The client cannot submit an owner value. Direct player Pick mutations are denied. |
| Multiple entries | The existing product resolves and scores one canonical Entry per owner; the old test requested two Entries for one account. | The release keeps one active Entry per player, as directed. The guarded create checks for an existing active Entry and uses a deterministic, generation-based ID so concurrent creates contend on one ID. Existing duplicate records are neither overwritten nor deleted. The `test26-r2` run uses five player accounts. |
| Automatic season state | Stored `Season.status` is operator-controlled and was never updated at kickoff. | The effective locked state is derived from the deadline for display; the backend independently rejects late writes. No scheduler or stored status migration is needed. |

## Changed paths

- `leaderboard/amplify/data/resource.ts` and `leaderboard/amplify/data/secure-picks/`: guarded API operations, authorization, server rules, and rule tests.
- `leaderboard/src/data/{entryRepository,picksRepository,leaderboardRepository,gamePickSplitsRepository}.js`: player writes and privacy-sensitive reads use the guarded operations. Existing partial-save error and reconciliation paths remain.
- `leaderboard/src/utils/{gamePickSplits,leaderboardScoring,pickWindow}.js`, `leaderboard/src/hooks/useSeasonLeaderboard.js`, and `leaderboard/src/layout/AdminLayout.jsx`: safe aggregate scoring and effective state display.
- Focused tests for these paths and `docs/backend/test26-r2-regression.md`.

## Local verification

`npm test` passes 139 tests, including deadline boundaries, ownership failures, pre-kickoff filtering, duplicate-entry rules, DynamoDB conditional-write error display, partial Pick persistence and reconciliation, pagination, and `test26-r2` isolation. `npm run amplify:typecheck`, `npm run build`, and `git diff --check` pass. The build reports only existing bundle-size and dynamic-import warnings.

## Deployment and staging gates

An Amplify Data schema and Lambda deployment is required on the isolated staging branch. No data migration is required for the fixture or existing Entry/Pick records. The seed/reset scripts pin the previous deployed schema hash, so their target hash must be reviewed and rebaselined after the staging deployment. The `test26-r2` fixture, season namespace, and scripts remain usable otherwise. No Cognito policy change is required.

Before the full season simulation, use two player tokens and an admin token against the deployed API to verify: generated player Pick/Entry creates, updates, and deletes are denied; guarded writes pass before and fail at/after the deadline; cross-owner and nonexistent Entry IDs fail; raw Pick list, index, relationship, and subscription paths do not reveal pre-kickoff selections; guarded visibility reveals only scheduled-started games; a duplicate Entry creation fails; five accounts can save and reload independent picks; admin corrections still work. Check that any historical duplicate Entries are retained unchanged.

The local rule tests cannot verify deployed AppSync authorization, IAM access to Data from the function, Lambda packaging, or the exact generated GraphQL response shape. Existing duplicate Entries remain in storage, but the one-entry UI still displays only its canonical choice; inspect any legacy duplicates through the admin data view before migration decisions. The function checks server time again immediately before each write, but the read and write are separate requests; a request crossing the exact deadline between that check and the model write is a narrow residual race. Do not call the staging season simulation ready until the deployment and API checks pass. No production access or deployment is part of this remediation.
