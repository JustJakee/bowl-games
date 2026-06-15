# Amplify Gen 2 Console Deployment

## Purpose

This branch is prepared for deployment as a separate staging Amplify app through the AWS Amplify Console.

It is not a production cutover.

## Current production safety rules

- The live site is `https://www.bobsbowlgamepicks.com/`.
- Production remains attached to the existing Amplify app:
  - `BobsBowlGamePicks - Frontend - CI/CD`
- Production uses the `main` branch.
- Do not attach the production domain to this staging branch.
- Do not replace the existing production Amplify app yet.
- Do not delete the old `BobsBowlGamePicks - Backend` app yet.

## Branch structure in this PR

- Preserved Gen 1 backend:
  - `leaderboard/amplify-gen1-legacy/`
- New Gen 2 backend:
  - `leaderboard/amplify/`
- Active frontend app root remains:
  - `leaderboard/`

## Recommended staging app

- App name:
  - `BobsBowlGamePicks - Gen2 Staging`
- Git branch:
  - the current branch containing this PR
- App root / monorepo root:
  - `leaderboard`

## What this PR includes

- new Amplify Gen 2 backend entrypoint under `leaderboard/amplify/`
- Cognito auth foundation
- email/password auth only
- lowercase groups:
  - `player`
  - `admin`

## What this PR does not include

- no production domain cutover
- no data migration
- no Gen 2 data models yet
- no frontend wiring to the new backend
- no CRA to Vite migration
- no SMS auth
- no SMS MFA
- no WAF
- no storage
- no real-time chat or subscriptions

## AWS Amplify Console steps

1. Open AWS Amplify Console.
2. Create a new Amplify app for staging.
3. Connect the repository.
4. Select the current branch for this PR.
5. Set the app root to `leaderboard`.
6. Review build settings before saving.
7. Start the deployment.

Important:

- Do not attach the production domain.
- Do not change the domain connection for the existing production app.
- Do not repoint the `main` branch app to this branch.

## Why app root stays `leaderboard`

- The frontend app already lives in `leaderboard/`.
- The new Gen 2 backend is now also under `leaderboard/amplify/`.
- This keeps the staging branch aligned with how Amplify Console expects a standard app root, without requiring local `ampx sandbox`.

## Build config note

No `amplify.yml` was added in this PR.

Reason:

- `leaderboard/` is already the application root for the CRA app.
- Adding build overrides in this PR would create extra deployment risk without proving they are required.
- Build behavior should first be reviewed in staging Console logs.

If Amplify Console later requires explicit build configuration, add that in a follow-up PR based on actual staging log evidence.

## Browser-based validation checklist

### Build

Confirm in Amplify Console build logs:

- dependencies install successfully
- frontend build succeeds
- backend deployment step succeeds
- the build is running from app root `leaderboard`
- no step attempts to reuse `leaderboard/amplify-gen1-legacy/` as the active backend

### Cognito

Confirm in generated staging resources:

- a Cognito user pool exists
- email/password sign-in is enabled
- groups exist:
  - `player`
  - `admin`
- no phone sign-in requirement was introduced
- no SMS auth was introduced
- no SMS MFA was introduced

### AppSync / data resources

For this PR, confirm:

- no target data models are deployed yet
- no staging data migration occurred
- no unexpected AppSync/data resources were created beyond what this PR intentionally defines

### Production separation

Confirm:

- production domain remains connected to the existing production app
- current production site still works
- staging resources are separate from production resources

## What cannot be validated locally in this PR

- actual Amplify Console backend deployment success
- actual Cognito resource creation
- actual branch wiring and staging app behavior in AWS
- whether Amplify Console needs extra build configuration for this branch

These must be validated manually in the AWS Amplify Console.

## Local validation performed in this PR

- repository structure updated for Gen 1 legacy preservation plus new Gen 2 path
- local frontend build can be run from `leaderboard`
- local backend TypeScript check can be run from `leaderboard` after dependency install

## Next recommended PR

Add the Gen 2 data layer under `leaderboard/amplify/data/resource.ts` with:

- `UserProfile`
- `Season`
- `SeasonConfig`
- `Game`
- `Entry`
- `Pick`
- `AdminAction`
- `ArchivedSubmission`

That follow-up PR should also implement the documented backend authorization checkpoint before any frontend cutover work begins.
