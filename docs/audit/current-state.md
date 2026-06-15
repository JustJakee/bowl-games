# Current State Audit

## Frontend overview

- The active app lives in `leaderboard/`. The repo root `package.json` is not the application package; it only declares `antd`.
- Build framework: Create React App via `react-scripts` 5.0.1.
- React version: `react` / `react-dom` 18.3.1.
- Language: JavaScript only. No TypeScript files are present in the app.
- Entry points:
  - `leaderboard/src/index.js` mounts `App` and wraps it in `ScoreboardProvider`.
  - `leaderboard/src/App.js` configures Amplify from `src/amplifyconfiguration.json` unless `AWS_DISABLED` is true.
  - `leaderboard/public/index.html` is the CRA HTML template and still uses `%PUBLIC_URL%`.
- Routing approach:
  - No `react-router`.
  - Navigation is local component state in `App` via `currentPage`.
  - Effective pages are `home`, `picks`, `leaderboard`, `all-picks`, and `schedule-view`.
- State management:
  - React local state for page state, lock state, toasts, picks loading, and loaded submissions.
  - React context in `src/context/NCAAFDataContext.jsx` for ESPN scoreboard polling.
  - No Redux, Zustand, React Query, or external client state library.
- Styling approach:
  - Global CSS files under `src/styles/`.
  - MUI components and icons for UI primitives.
  - Ant Design table in `AllPicks`.
  - Bootstrap CSS imported globally.
- Frontend dependencies in real use:
  - `aws-amplify` for GraphQL client/config.
  - `@mui/material` and `@mui/icons-material`.
  - `antd`.
  - `bootstrap`.
- Declared but not used in source as currently checked in:
  - `@aws-amplify/ui-react`
  - `cfb.js`
  - `dotenv`
  - `papaparse`
  - `react-icons`

## Main pages and components

- `App.js`
  - Controls top-level navigation and the bowl-season/off-season split.
  - `isBowlSeason` is currently hardcoded to `false`, so the live app path renders `WinnersPodium` instead of the in-season app.
  - `isLocked` defaults to `true` and is only unlocked through a client-side helper.
- `components/Home.jsx`
  - Landing page and pseudo-login screen.
  - Uses hardcoded credentials: username `bobs`, password `picks`.
  - Before games start, exposes pick entry and leaderboard links after unlock.
  - After games start, exposes leaderboard, all picks, and scores after unlock.
  - Displays the $5 entry fee as static text only.
- `components/PickForm.jsx`
  - Builds pick cards from the live scoreboard context.
  - Collects `name`, `email`, per-game picks, and tie-breaker total.
  - Prevents duplicate display names based on current submissions.
  - Confirms submission with `window.confirm`.
  - Writes submissions through GraphQL `createSubmission`.
  - `picksClosed` is currently hardcoded to `false`.
- `components/Leaderboard.jsx`
  - Scores picks against winners derived from the scoreboard feed.
  - Uses the tie-breaker bowl total to sort ties.
  - If no winners exist yet, shows `Picks Submitted` instead of `0` correct picks.
  - Prize values are hardcoded strings.
- `components/AllPicks.jsx`
  - Displays all picks in an Ant Design table.
  - Reads the same submission records already loaded by `App`.
- `components/ScheduleView.jsx`
  - Displays live/final game cards from the ESPN scoreboard feed.
- `components/Header.jsx`
  - Drives nav actions and CSV export.
  - CSV export fetches submissions again and serializes the first entry's bowl key order.
- `components/GamesBanner.jsx`
  - Poll-driven top banner of up to 20 games from the scoreboard feed.
- `components/WinnersPodium.jsx`
  - Off-season-only static winners page.
  - Includes a suggestion box posting to a Google Form.

## Data-fetching and app behavior

- Live game data source:
  - `src/api/espn.js` calls ESPN's public college-football scoreboard endpoint with `seasontype=3`.
  - `src/utils/formatGameData.js` normalizes ESPN events into app game objects.
  - `src/context/NCAAFDataContext.jsx` polls every 60 seconds by default.
  - The context excludes quarterfinals, semifinals, the national championship, and the FCS championship.
- Picks data source:
  - `src/utils/fetchPicks.js` runs GraphQL `listSubmissions`.
  - `src/utils/uploadPicks.js` runs GraphQL `createSubmission` with `authMode: "apiKey"`.
- Generated GraphQL client files:
  - `src/graphql/queries.js`
  - `src/graphql/mutations.js`
  - `src/graphql/subscriptions.js`
  - `src/graphql/schema.json`
- Static/reference data:
  - `src/constants/teamNames.js` maps long team names to abbreviations.
  - `src/constants/matchups.js` and `src/constants/gamesWithTimes.js` appear to be season-specific reference data and are not part of the current live data path.
  - `src/assets/mockBowls*.json` are mock assets and not currently wired into production flow.

## Storage and persistence

- `localStorage` usage:
  - `components/WinnersPodium.jsx` stores `bowlSuggestionsCooldownUntil` to throttle suggestion submissions for one hour.
- `sessionStorage` usage:
  - None found.
- No persistence exists for:
  - pseudo-login state
  - in-progress picks
  - current page
  - loaded scoreboard data

## Environment variables and generated frontend config

- No `process.env`, `REACT_APP_*`, `import.meta.env`, or `VITE_*` reads were found in the source.
- Frontend AWS config is committed in `src/amplifyconfiguration.json` and contains:
  - AppSync endpoint
  - region `us-east-2`
  - auth type `API_KEY`
  - an AppSync API key
- `aws-exports.js` is not present; this app uses `amplifyconfiguration.json`.
- `AWS_DISABLED` in `src/constants/appFlags.js` is currently `true`, which prevents Amplify configuration and makes GraphQL reads return empty data from helper functions.

## Backend overview

- Amplify backend is Gen 1 CLI project under `leaderboard/amplify/`.
- Categories present:
  - `api` only
- Categories not present in repo:
  - `auth`
  - `storage`
  - `function`
  - `hosting`
- Amplify API:
  - Name: `bobsbowlgamepicks`
  - Service: AppSync
  - Default auth: API key
  - API key expiry configured for 7 days
- GraphQL schema:
  - Single model `Submission`
  - Fields:
    - `id: ID!`
    - `name: String!`
    - `email: String!`
    - `picks: AWSJSON`
    - `tieBreaker: Int`
    - `createdAt: AWSDateTime!`
  - Auth rule allows only `create` and `read` publicly via `apiKey`.
  - Generated GraphQL operations also include `updateSubmission` and `deleteSubmission`, but the schema auth rule does not grant public update/delete.
- Data storage inferable from Amplify:
  - `@model` implies a DynamoDB table backing `Submission`.
  - Billing mode is `PAY_PER_REQUEST`.
  - DynamoDB server-side encryption is explicitly disabled in `parameters.json`.
- Environments:
  - One environment is checked in: `bowlpicks`.
  - Region: `us-east-2`
  - Amplify App ID: `d152p2gb5ii4jy`
- Generated/config files used by frontend:
  - `src/amplifyconfiguration.json`
  - `src/graphql/*`
  - `.graphqlconfig.yml`

## Auth and user identity status

- Auth exists today only as a client-side gate in `Home.jsx`.
- Cognito resources are not present in `amplify/backend`.
- Users do not actually log in to AWS-backed identities.
- Picks are tied to submitted `name` and `email` strings only.
- There are no admin-only resource protections in the frontend or backend found in this repo.
- Who can submit picks:
  - Anyone who reaches the client and knows the hardcoded credentials can unlock the UI.
  - Backend create/read access is public through the AppSync API key.
- Who can edit picks:
  - The UI does not expose editing after create.
  - There is no account-bound ownership model.
  - The schema auth rule does not allow public updates, so edits are effectively not supported through the current client path.

## Deployment and hosting status

- Hosting provider:
  - Likely AWS Amplify Hosting or AWS-managed Amplify app, inferred from `AmplifyAppId` in `team-provider-info.json`.
  - The repo does not contain an Amplify Hosting category or an `amplify.yml`, so exact hosting config is unknown.
- Live deployment assumption:
  - Root `README.md` links to `https://bobsbowlgamepicks.com/leaderboard/`, so the app appears to be served from a `/leaderboard/` subpath.
- Build command:
  - `npm run build` inside `leaderboard/`
- Output directory:
  - CRA default `build/`
- Node version:
  - No `.nvmrc`, `.node-version`, or `engines` field found in `leaderboard/package.json`.
- CI/CD:
  - No GitHub Actions, Netlify, Vercel, or Docker-based deployment config was found.
- Deployment env vars:
  - None are referenced in source.
  - Amplify runtime config is committed directly instead of injected at build time.

## Dependency and testing health

- Scripts in `leaderboard/package.json`:
  - `start`
  - `build`
  - `test`
  - `eject`
- Testing setup:
  - CRA/Jest default setup via `setupTests.js`.
  - `App.test.js` is still the default CRA sample test and expects `learn react`, which does not exist in the current app.
  - Practical result: the checked-in test file is stale and likely fails if run unchanged.
- Major migration-sensitive dependencies:
  - `react-scripts` 5.0.1
  - `aws-amplify` 6.10.3
  - `@mui/material` 6.3.1
  - `antd` 6.0.0
- Obvious dependency risks:
  - CRA / `react-scripts` is legacy relative to the planned Vite move.
  - The app mixes MUI, Ant Design, Bootstrap, and custom CSS, which increases bundle and styling coupling during frontend migration.
  - Several unused declared dependencies suggest package drift.

## Known issues and assumptions

- The in-season app is currently disabled by `isBowlSeason = false`.
- AWS calls are globally disabled in the checked-in app through `AWS_DISABLED = true`.
- The pseudo-login is not security control; it is only a frontend toggle.
- Submission identity is not durable because it is based on freeform display name and email.
- Email addresses are included in the public GraphQL `listSubmissions` response shape.
- The suggestion box depends on a Google Form endpoint outside AWS.
- The app assumes bowl identity from display names. Picks are stored as an `AWSJSON` object keyed by bowl names, including duplicate-name disambiguation such as `Bowl Name (#2)`.

## Unknowns requiring clarification

- Exact production hosting configuration and branch mappings.
- Whether Amplify Hosting is still the active deployment path for the current domain.
- Whether any AppSync/DynamoDB data already exists in production and needs preservation.
- Whether the checked-in AppSync API key is still valid or rotated elsewhere.
- Whether there are any manual admin workflows outside the repo for closing picks, reconciling payments, or exporting results.
- Whether the `/leaderboard/` URL path is produced by hosting config, a monorepo path convention, or a reverse proxy rule.
