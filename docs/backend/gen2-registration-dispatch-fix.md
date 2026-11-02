# Registration approval dispatch regression

## Report and root cause

During staging regression, email registration/confirmation and pending-user
sign-in worked, but Admin Approvals returned `Unsupported registration operation.`
and also displayed an empty-list message.

The frontend calls `dataClient.queries.listPendingRegistrations` with user-pool
auth and no GraphQL arguments. Approval calls
`dataClient.mutations.approveRegistration({ username })`. The schema defines both
operations with the `admin` group and the same registration Lambda handler.

The installed Amplify `@function` transformer generates a pipeline resolver
that stashes the GraphQL type/field names, then invokes Lambda with:

```json
{
  "typeName": "Mutation",
  "fieldName": "approveRegistration",
  "arguments": { "username": "<Cognito username>" },
  "identity": { "claims": { "cognito:groups": ["admin"] } }
}
```

Additional payload fields are `source`, `request`, and `prev`. There is no
`info.fieldName` wrapper or custom `action` argument. The registration handler
looked for `event.info.fieldName`, so it passed the administrator identity check
then fell through dispatch before calling Cognito. This is an event-contract
dispatch mismatch, not a demonstrated Cognito verification/configuration or
authorization failure.

The empty-state bug was independent: the page checked only loading and list
length, so a failed first request still rendered the initial empty array as a
successful empty result.

## Targeted correction

- Dispatch on top-level `event.fieldName`; leave `event.arguments.username` and
  Cognito command behavior unchanged.
- Require no active error before rendering the empty-state message.
- Keep backend errors visible in the existing Alert, with retry available.
- Retain both schema-level admin authorization and the handler identity check.
- Listing never adds a group. Approval rechecks `AdminGetUser.UserAttributes`,
  accepts only confirmed/email-verified accounts, and adds only `player`.
- No changes to secure-picks, auth configuration, or seed/reset tooling.

The separate [secure-picks dispatch follow-up](gen2-secure-picks-dispatch-fix.md)
now corrects the same defect for its four operations, pending together with this
registration fix. Its business rules and authorization remain unchanged.

## Regression coverage

`npm run test:registration` now includes `contract.test.mjs` alongside the
existing helper tests. It bundles the real handler/repository/page, replacing
only AWS/network configuration boundaries. Coverage includes:

- The installed Amplify client's generated GraphQL operation and variables,
  passed through the resolver event to the production handler.
- Top-level field dispatch and the username argument.
- Paginated ListUsers filtering, Group lookup, and AdminGetUser's different
  attribute property name.
- Fixed player-group assignment, idempotent approval, and no automatic approval.
- Rejection of non-admin callers, unverified users, admin targets, unsupported
  operations, and missing username.
- Backend error propagation, failed approval confirmation, and rendered
  loading/error/empty/list result states.

The offline synthesis preflight also checks the generated schema argument
definitions and resolver dispatch templates, then replays the actual generated
Lambda request template through those handler contract tests. Unknown template
expressions fail the replay rather than silently assuming another event shape.

## Deployment and live verification

Local validation on `gen2-updates`, 2026-11-02, Node `26.13.0`:

- `npm run preflight:gen2` passed all steps.
- All 154 automated tests passed, including 11 registration tests.
- Root and backend-local TypeScript checks passed.
- Offline synthesis, both Lambda bundles, and the replay of eight contract tests
  against the generated resolver payload passed.
- Frontend production build and staged/unstaged whitespace checks passed.
- Generated model schema inspection confirmed admin-only authorization on both
  registration fields and the sole required approval argument `username: String!`.
- Existing dependency audit, schema-owner, and frontend bundle/import warnings
  remain; no dependency or unrelated authorization change was made.

Both a staging backend deployment (updated Lambda bundle) and frontend build
are required. The fix does not require a schema, Cognito pool, group, or data
migration. No deployment is performed by these tests.

After deployment, use the existing confirmed test account:

1. As admin, refresh Approvals and verify the account appears without an error.
2. Approve it; verify Cognito adds only `player` and the pending list removes it.
3. As that user, choose **Check approval** to force-refresh tokens, then complete
   profile onboarding if needed and verify app access.
4. Verify a player/pending account cannot list or approve registrations directly.
5. Verify an actual backend failure shows the error without the empty message.

This live post-deployment check remains distinct from mocked Cognito contract
tests. The code already force-refreshes approval tokens in AuthShell; no account
was approved and no backend was deployed during the local fix.
