# Cost Guardrails

## Cost target

- Normal monthly AWS cost: `$0-$5`
- Warning threshold: `$10/month`
- Emergency threshold: `$25/month`

This project should stay within hobby-grade AWS spend. Product and implementation choices should prefer simpler managed services with low idle cost and no always-on compute.

## Non-negotiable guardrails

- No SMS auth.
- No SMS MFA.
- No WAF unless explicitly approved.
- No always-on servers.
- No RDS.
- No OpenSearch.
- No AppSync caching instances.
- No real-time chat or GraphQL subscriptions in the first auth migration.
- No media or video hosting in AWS.
- Add AWS Budgets alerts before production cutover.

## Recommended service posture

- Auth:
  - Cognito user pools with email/password sign-in
  - avoid SMS-based flows
- Backend:
  - Amplify Gen 2 backed by serverless managed resources
- Data:
  - DynamoDB on-demand or other low-idle serverless defaults
- Frontend hosting:
  - keep static hosting posture; no custom always-on app server

## Why these constraints fit this app

- Traffic is seasonal and likely spiky around bowl season, not constant year-round.
- The app does not need 24/7 dedicated compute.
- The current feature set is CRUD, leaderboard reads, and scheduled sports data display.
- Chat, rich media, and high-frequency real-time features would add disproportionate complexity and cost.

## Specific recommendations

## Authentication

- Prefer email/password Cognito.
- Do not enable SMS MFA.
- If MFA is ever needed later, prefer a non-SMS option if supported by the chosen auth flow.

## Data model and API

- Keep live scoring computed on read in early versions rather than precomputing and persisting many leaderboard projections.
- Avoid wide fan-out write patterns unless there is a proven performance need.
- Keep admin audit logging compact and scoped to changed fields only.

## Public reads

- Public leaderboard and schedule data should be query-efficient.
- Avoid returning raw private records when a curated public read model or query can return only what the page needs.

## Polling

- Avoid aggressive backend polling.
- Frontend polling should be season-aware and disabled or slowed during the off-season.
- If ESPN data is later synced into the backend, use conservative polling intervals and avoid high-frequency scheduled jobs.

## Frontend and hosting

- Static frontend hosting is preferred.
- Avoid backend-driven server rendering for the first revamp unless a clear need emerges.
- Continue using external non-AWS services for non-core off-season feedback flows if they remain simpler and cheaper.

## Budgets and alerts

Before production cutover:

- Create AWS Budget for `$5/month` target tracking.
- Add warning alert at `$10/month`.
- Add emergency alert at `$25/month`.
- Send alerts to at least one maintained email address.

## Cost risks to watch

- Cognito usage growth if auth flows expand beyond basic email/password.
- DynamoDB read/write spikes during pick deadlines and bowl days.
- Excessive public polling if frontend refresh rates stay aggressive across many users.
- Overuse of admin audit payload size if before/after values become large.
- Future chat or media features, which are explicitly out of scope for the first migration.

## Explicitly deferred cost drivers

- SMS-based auth and recovery
- WAF
- real-time chat/subscriptions
- file/media pipelines
- video hosting
- serverful admin backends
- analytics stacks with recurring baseline cost

## Decision filter for future PRs

If a proposed implementation adds recurring monthly cost, ask:

1. Does this solve a real current-season problem?
2. Is there a serverless or simpler alternative?
3. Does it push the project above the `$5` normal target?
4. Does it create idle cost outside bowl season?

If the answer to the last two is yes, it should be rejected or explicitly approved.

## Unknowns

- Actual current monthly spend is Unknown from the repo.
- Actual traffic volume and peak-day request patterns are Unknown from the repo.
