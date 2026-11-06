# Leaderboard Frontend

See the [Gen 2 development notes](../docs/gen2/README.md) for architecture,
feature behavior, local setup, deployment, testing, and future development.

## Amplify Auth Note

The shared Amplify client imports `leaderboard/amplify_outputs.json` before
creating the Data client. Generate that file for the existing staging backend
before starting or building the app. The predev/prestart/prebuild hooks also
copy it to `public/`. See [local setup](../docs/gen2/local-development.md).

This repo is not using local `ampx sandbox` right now. The current validation
path for auth is the Amplify Console branch deployment, which generates
`amplify_outputs.json` for the hosted environment.

## Available Scripts

In the `leaderboard` directory:

### `npm run dev`

Starts the Vite dev server.

Open http://localhost:5174. The server uses a strict port.

### `npm start`

Alias for the Vite dev server.

### `npm run build`

Builds the app for production into `dist/` and generates `dist/sw.js`.
The service worker caches public app files for a reliable launch and shows
`offline.html` when a navigation fails without a connection. It does not cache
Amplify, ESPN, or account data. Players can open **Install App** below Rules in
the desktop sidebar or mobile drawer; browsers that support an install prompt
show a button there, and other browsers show manual installation steps.

The app icons are generated from `public/branding/bobs-bowl-games-icon.png`.
After replacing that source image, run this from the `leaderboard` directory
on Windows and commit the generated PNG and ICO files:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-brand-icons.ps1
```

### `npm run preview`

Serves the production build locally from `dist/`.

### `npm test`

Runs the focused entry, picks, leaderboard, schedule, dashboard, seed,
secure-picks, registration, and season-experience suites. See the
[test map](../docs/gen2/testing.md).
