# Architecture and migration boundaries

[Index](README.md) · Snapshot: 2026-11-02 / `e915e2f`

## What changed

The original app displayed legacy submissions and standings. Gen 2 introduces
authenticated player accounts, season-scoped data, persistent draft picks,
administrator tools, and server-enforced write and visibility rules.

The app root remains `leaderboard/`. The repository-root `package.json` is not
the frontend package. Run application commands from `leaderboard`.

| Concern | Current source |
| --- | --- |
| Backend composition | [amplify/backend.ts](../../leaderboard/amplify/backend.ts) |
| Cognito definition | [auth/resource.ts](../../leaderboard/amplify/auth/resource.ts) |
| Data schema and custom operations | [data/resource.ts](../../leaderboard/amplify/data/resource.ts) |
| Player write/privacy service | [secure-picks/handler.js](../../leaderboard/amplify/data/secure-picks/handler.js) |
| Registration approval service | [registration-admin/handler.js](../../leaderboard/amplify/data/registration-admin/handler.js) |
| Shared browser configuration | [auth/amplifyConfig.js](../../leaderboard/src/auth/amplifyConfig.js) |
| Provider composition | [main.jsx](../../leaderboard/src/main.jsx) |
| Page routing | [AppRouter.jsx](../../leaderboard/src/app/AppRouter.jsx) |
| Hosting build | [amplify.yml](../../amplify.yml) |

## Runtime flow

1. `main.jsx` mounts the theme, browser router, `AuthProvider`,
   `ScoreboardProvider`, and `AppDataProvider`.
2. `amplifyConfig.js` imports `leaderboard/amplify_outputs.json`, configures
   Amplify, then creates the shared generated Data client.
3. `AuthShell` handles authentication, group approval, and profile onboarding
   before rendering the routed application.
4. Repositories load season data and owner/public-safe projections through
   Cognito user-pool authorization.
5. Player entry/pick writes and privacy-sensitive season reads use custom
   AppSync operations backed by the secure-picks Lambda.
6. That Lambda uses Amplify's function runtime configuration and IAM access to
   Data. It derives ownership from the signed-in identity and persisted records.
7. The registration Lambda calls Cognito using scoped service permissions.

## Migration boundaries

- `leaderboard/amplify/` is the active Gen 2 backend definition.
- `leaderboard/amplify-gen1-legacy/` preserves the Gen 1 backend.
- Legacy GraphQL files, `src/amplifyconfiguration.json`, older components, and
  `AWS_DISABLED` remain in the tree. Their presence does not define the active
  Gen 2 configuration or disable the current Data client.
- The active entrypoint is `src/main.jsx` → `App.jsx` → `AuthShell`/`AppRouter`.
  Trace imports from there before changing or deleting legacy files.
- The active season provider reads persisted Gen 2 `Game` records. ESPN helpers
  and fixtures still exist, but production schedule ingestion is separate work.
- Current local development connects to the deployed staging backend. The
  documented workflow does not create a local Amplify sandbox.
- No production-domain switch, Gen 1 deletion, or complete legacy-data import
  is established by the source changes or this documentation session.

## Development boundaries

Keep page presentation in `src/pages`, shared UI in `src/components` and
`src/features`, data calls in `src/data`, and reusable business rules in
`src/utils`. Backend rules are the security authority; frontend checks improve
feedback but cannot replace AppSync authorization or Lambda validation.
