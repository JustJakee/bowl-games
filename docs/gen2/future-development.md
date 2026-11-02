# Future development and known limits

[Index](README.md) · Observed from the source at `e915e2f`, 2026-11-02.

These are implementation limits and follow-up directions, not completed work.

## Release validation

- Run the full local preflight on the intended CI Node version and record results.
- Verify the latest staging deployment includes both Lambdas and current schema.
- Complete live registration/approval, owner/privacy, deadline, and five-player
  regression checks in the existing staging runbooks.
- Review actual Cognito-scoped IAM grants and any CloudFormation replacement or
  deletion before approving infrastructure changes.
- Rebaseline guarded seed schema hashes only after reviewing the new deployment.
- Verify local browser startup, sign-in, and data access. Laptop setup proved a
  production build, not those interactive flows.

## Data integrity and scale

- Global username uniqueness is still a client-side availability check, not an
  atomic reservation. Add a server-owned strategy if uniqueness is required.
- Entry name lookup indexes do not enforce global season-wide uniqueness. The
  guarded service currently checks active names within the caller's entries.
- Preserve and inspect historical duplicate entries before cleanup; canonical
  selection hides duplicates in normal views without migrating stored records.
- Server deadline checks and model writes are separate operations. Consider
  stronger atomic enforcement for requests crossing the exact deadline.
- Multi-pick saves intentionally allow partial success and reconcile afterward;
  do not assume transactional submission semantics.
- `listRawSeasonGames` and `loadAdminGames` currently read one list page. Review
  pagination before scaling schedules beyond response limits. Other repository
  paths already paginate and provide patterns to follow.
- Full-season visibility reads aggregate records in the Lambda. Revisit query
  and payload sizes as seasons/player counts grow.

## Season rules and scoring

- Align configured lock time with earliest kickoff. Presentation helpers use
  configured times while the backend chooses the earlier deadline.
- Championship identification currently depends on the exact bowl label. A
  stable game/config reference would make renamed fixtures safer.
- Standings use one point per correct final result. Schema fields for confidence,
  rank, awarded points, and scoring JSON do not yet define alternate scoring.
- Review canceled-game completion semantics before a real season: required-pick
  selection and final-state presentation use different criteria.
- Define equal-score/equal-tiebreaker shared ranking and payout rules explicitly.
- Add a reviewed historical awards source if dynamic previous-season payouts
  must display. Preserve completed seasons rather than embedding future winners.

## Admin and audit coverage

- Payment changes currently update status only. Add timestamp/reason/audit writes
  deliberately if required; `AdminAction` is not automatically populated.
- Define and audit privileged pick corrections before exposing an override UI.
- `isTestSeason` currently gates the admin game UI; generated admin model access
  is broader. Add service-side restrictions if that boundary must be enforced.
- Approval listing queries groups for verified users individually; revisit for
  larger Cognito pools or throttling.

## Tooling and migration completion

- Pin a supported Node version consistently for laptops and Amplify Hosting.
- Review dependency audit findings separately. The laptop installation reported
  94 findings; no audit remediation was attempted during setup.
- Revisit direct `aws login` support after updating Amplify's credential-provider
  dependencies; the in-memory export bridge is a documented workaround.
- Review offline synthesis whenever pinned Amplify/CDK internals change.
- The frontend build warns about bundle size and a module imported both
  dynamically and statically. Optimize if measurements justify it.
- Design the production ESPN import/sync process separately from test seeding.
- Design legacy-data reconciliation/import and production cutover separately.
- Remove unused legacy components/configuration only after tracing active imports
  and confirming the Gen 1 preservation boundary.

Keep each completed follow-up's source change, focused tests, operational
evidence, and relevant topic documentation together in the same review.
