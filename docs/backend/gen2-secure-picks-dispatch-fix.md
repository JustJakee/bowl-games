# Secure-picks dispatch contract regression

## Defect and scope

The secure-picks handler had the same dispatch defect as registration:
Amplify's generated Lambda payload carries top-level `fieldName`, but the
handler read `event.info.fieldName`. All four custom operations were affected:

| Operation | Type | Arguments |
| --- | --- | --- |
| `createSeasonEntry` | Mutation | seasonId, entryName, contactEmail, optional userProfileId |
| `updateSeasonEntry` | Mutation | entryId and optional editable entry fields |
| `saveSeasonPick` | Mutation | entryId, gameId, selectedTeam |
| `visibleSeasonPicks` | Query | seasonId |

Only the four dispatch lookups and an explanatory comment change in production
secure-picks code. The pending registration fix remains intact. No schema,
IAM, Cognito, pick-rule, infrastructure, or frontend behavior changes are
required for this follow-up.

## Actual generated contract

Each AppSync pipeline stashes the GraphQL field/type, authorizes the request,
and invokes its Lambda stage with:

```json
{
  "typeName": "Mutation",
  "fieldName": "saveSeasonPick",
  "arguments": {
    "entryId": "<entry>",
    "gameId": "<game>",
    "selectedTeam": "<team abbreviation>"
  },
  "identity": { "sub": "<player subject>", "groups": ["player"] },
  "source": null,
  "request": { "headers": {} },
  "prev": null
}
```

Identity includes the actual caller's claims; source/request/prev depend on
AppSync context. There is no custom action argument or nested info wrapper.
The schema arguments are passed unchanged under `arguments`.

The active backend defines only two custom Lambda handlers: secure-picks and
registration-admin. The former now uses top-level dispatch for all four fields;
the latter's pending fix already does so for its two registration fields.
The synthesis check inventories all six custom Lambda-backed fields and fails
if another operation is added without updating the contract coverage.

## Preserved security and business behavior

- Generated user-pool authorization remains `player` for every secure-picks field.
- The existing IAM service path is unchanged.
- Player writes still reject missing player membership and identities containing
  `admin`, and derive ownership from the signed-in subject/persisted Entry.
- Active/open season, opening time, earliest kickoff/configured deadline, and
  immediate pre-write time checks are unchanged.
- One active entry, soft deletion, profile linkage, game/team validation, and
  immutable player payment/ownership fields remain unchanged.
- Raw pick authorization, safe visibility DTOs, owner-only pre-kickoff choices,
  per-game kickoff reveal, and championship tiebreaker reveal remain unchanged.
- Unknown/missing operations fail before model access; no fallback action or
  nested-info dispatch is accepted.

`visibleSeasonPicks` relies on the existing AppSync group gate plus the handler's
signed-in identity check. Direct handler tests do not replace live AppSync
authorization testing.

## Regression coverage and preflight

`amplify/data/secure-picks/contract.test.mjs` bundles and executes the real
handler/rules with an in-memory Data client replacing only initialization and
network boundaries. Thirteen tests cover all operations, valid writes and
visibility, anonymous requests, pending/admin write rejection, server deadlines,
ownership/game failures, one-entry enforcement, and unsupported dispatch.

`scripts/tests/secure-picks-resolver-contract.mjs` reads actual synthesized
CloudFormation/VTL/schema artifacts. For each operation it verifies argument
types, player-only schema rules, the generated static-group authorization stage,
the field/type stash, pipeline linkage to the invocation function, and the flat
Lambda payload. It then replays each operation's generated request template
through the production-handler tests. Existing registration replay remains.

Both tests are wired into `npm run preflight:gen2` through the normal secure-picks
suite and offline synthesis step. No deployed service or fixture is accessed by
these contract tests.

## Combined staging verification still required

Local validation on `gen2-updates`, 2026-11-02, Node `26.13.0`:

- `npm run preflight:gen2` passed all steps.
- All 167 automated tests passed: 20 secure-picks tests and 11 registration
  tests are included in that count.
- Both backend TypeScript checks, both Lambda bundles, and backend synthesis passed.
- Generated-template replay passed all 13 secure-picks and eight registration
  contract tests in addition to the normal automated suite.
- Frontend production build and staged/unstaged whitespace checks passed.
- Existing audit/schema-owner/bundle/import warnings remain. No dependency,
  schema, authorization rule, infrastructure, or lockfile changes were made.

Deploy the combined registration and secure-picks Lambda fixes to staging, with
the pending frontend error-state correction. No schema/data migration or seed
is required for the dispatch fixes.

1. Verify confirmed pending-account listing, admin approval, player-only group
   assignment, token refresh, profile onboarding if needed, and application access.
2. As a player, create/load the existing single entry, edit it, save/change/clear
   picks, and reload to verify persistence through all guarded operations.
3. Verify pending/non-player accounts cannot invoke secure-picks operations
   through AppSync; admin accounts cannot create competition entries/picks.
4. Use two players to verify ownership denial and pre-kickoff privacy, per-game
   kickoff reveal, and championship tiebreaker visibility.
5. Verify writes fail at/after the server deadline while permitted visibility
   reads continue, and admin management workflows remain available.
6. Check AppSync/Lambda logs for both unsupported-operation errors and unexpected
   authorization/runtime failures. Unknown operations must still fail closed.

No production access, automatic deployment, commit, push, seed, or reset is part
of this local verification task. Local synthesis cannot certify live IAM,
AppSync authorization, Cognito token propagation, or browser behavior.

## Files changed by this follow-up

The earlier pending registration implementation/tests are retained. Incremental
changes for secure-picks are:

- `leaderboard/amplify/data/secure-picks/handler.js`
- `leaderboard/amplify/data/secure-picks/contract.test.mjs`
- `leaderboard/scripts/tests/secure-picks-resolver-contract.mjs`
- `leaderboard/scripts/preflight-gen2-synth.mjs`
- `leaderboard/package.json`
- `docs/backend/gen2-secure-picks-dispatch-fix.md`
- `docs/backend/gen2-registration-dispatch-fix.md` (resolve the follow-up note)
- `docs/gen2/entries-and-picks.md`
- `docs/gen2/testing.md`
