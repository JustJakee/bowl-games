# Leaderboard Frontend

## Amplify Auth Note

Frontend auth reads `amplify_outputs.json` at runtime and does not hardcode
AWS identifiers in source. Local auth testing requires a generated
`leaderboard/amplify_outputs.json` so the Vite app can serve it from `public/`
during `npm run dev`, `npm start`, or `npm run build`.

This repo is not using local `ampx sandbox` right now. The current validation
path for auth is the Amplify Console branch deployment, which generates
`amplify_outputs.json` for the hosted environment.

## Available Scripts

In the `leaderboard` directory:

### `npm run dev`

Starts the Vite dev server.

### `npm start`

Alias for the Vite dev server.

### `npm run build`

Builds the app for production into `dist/`.

### `npm run preview`

Serves the production build locally from `dist/`.

### `npm test`

Placeholder script. No test runner is configured for this migration.
