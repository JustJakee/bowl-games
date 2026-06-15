# Entity Map

## Submission / Entry

- Current entity name in backend: `Submission`
- Stored in:
  - Amplify GraphQL `Submission` model
  - DynamoDB table generated from the `@model`
- Source files:
  - `amplify/backend/api/bobsbowlgamepicks/schema.graphql`
  - `src/utils/uploadPicks.js`
  - `src/utils/fetchPicks.js`
  - `src/components/PickForm.jsx`
  - `src/components/Leaderboard.jsx`
  - `src/components/AllPicks.jsx`
  - `src/components/Header.jsx`
- Fields observed:
  - `id`
  - `name`
  - `email`
  - `picks` (`AWSJSON`)
  - `tieBreaker`
  - `createdAt`
  - generated `updatedAt` in GraphQL docs
- Created by:
  - `PickForm` submit path -> `uploadPicks` -> GraphQL `createSubmission`
- Read by:
  - `App` load path -> `fetchPicks` -> GraphQL `listSubmissions`
  - `Header` CSV export path -> `fetchPicks` -> GraphQL `listSubmissions`
- Updated by:
  - No active frontend update path
- Ownership / identity:
  - Not tied to a real authenticated user
  - Owned only in practice by freeform `name` and `email`
- Notes:
  - Public API-key `create` and `read`
  - No durable relation to future auth users

## Pick Set

- Current representation:
  - Embedded inside `Submission.picks` as JSON text
- Stored in:
  - `Submission.picks`
- Source files:
  - `src/components/PickForm.jsx`
  - `src/App.js`
  - `src/components/AllPicks.jsx`
  - `src/components/Leaderboard.jsx`
  - `src/components/Header.jsx`
- Created by:
  - `PickForm` builds an object keyed by `selectionKey`
  - Serialized with `JSON.stringify(picks)` on submit
- Read by:
  - `App` parses each submission's `picks`
  - `Header` parses picks again for CSV export
- Updated by:
  - Not supported in current client path
- Ownership / identity:
  - Inherits `Submission` identity only
- Notes:
  - Keys are bowl display names, not durable game IDs
  - Duplicate bowl names are disambiguated in memory as `Bowl Name (#2)`

## Bowl Game / Matchup

- Current representation:
  - Derived view model, not a persisted backend entity in this repo
- Stored in:
  - ESPN public API response at runtime
  - Some unused local reference files:
    - `src/constants/matchups.js`
    - `src/constants/gamesWithTimes.js`
    - `src/assets/mockBowls.json`
- Source files:
  - `src/api/espn.js`
  - `src/utils/formatGameData.js`
  - `src/context/NCAAFDataContext.jsx`
  - `src/App.js`
  - `src/components/ScheduleView.jsx`
  - `src/components/PickForm.jsx`
  - `src/components/GamesBanner.jsx`
- Created by:
  - Fetched from ESPN and normalized in `formatGameData.js`
- Read by:
  - Scoreboard context consumers
  - `App` memoized `matchups`
- Updated by:
  - Replaced on each scoreboard poll cycle
- Ownership / identity:
  - External ESPN event IDs
- Notes:
  - Current app excludes playoff quarterfinals, semifinals, national championship, and FCS championship from the context feed

## Winner / Result / Score

- Current representation:
  - Derived from scoreboard game state and scores
- Stored in:
  - Not persisted locally
  - Computed from ESPN data in `App.js`
- Source files:
  - `src/utils/formatGameData.js`
  - `src/App.js`
  - `src/components/Leaderboard.jsx`
  - `src/components/AllPicks.jsx`
- Created by:
  - `App` computes `winnerAbbr` when a game is final or `post`
- Read by:
  - `Leaderboard` scoring logic
  - `AllPicks` status tags
- Updated by:
  - Changes automatically as scoreboard poll responses change
- Ownership / identity:
  - External sports data only

## Leaderboard Standing

- Current representation:
  - Computed client-side only
- Stored in:
  - Not persisted
- Source files:
  - `src/components/Leaderboard.jsx`
- Created by:
  - Client-side score computation comparing each submission's picks against computed winners
- Read by:
  - Leaderboard UI only
- Updated by:
  - Recomputed on each render from current submissions + current matchup results
- Ownership / identity:
  - Derived from submission display names
- Notes:
  - Tie-breaker uses the total points of the `ReliaQuest Bowl`
  - Before any winners are available, UI shows `Picks Submitted` rather than `0`

## User / Entrant / Player

- Current representation:
  - Not a separate backend entity
  - Displayed as the `Submission.name`
- Stored in:
  - `Submission.name`
  - `Submission.email`
- Source files:
  - `src/components/PickForm.jsx`
  - `src/App.js`
  - `src/components/Leaderboard.jsx`
  - `src/components/AllPicks.jsx`
- Created by:
  - Manual input at pick submission time
- Read by:
  - All pick-display and leaderboard views
- Updated by:
  - No update path
- Ownership / identity:
  - Freeform text only
- Notes:
  - No Cognito user, UUID user entity, or admin role found

## Auth Session / Login State

- Current representation:
  - Frontend-only boolean lock state
- Stored in:
  - React state in `App`
- Source files:
  - `src/App.js`
  - `src/components/Home.jsx`
- Created by:
  - Hardcoded credential check against `bobs` / `picks`
- Read by:
  - `Home`
  - `Header`
- Updated by:
  - `loginHelper` in `App`
- Ownership / identity:
  - None
- Notes:
  - Refresh resets access because there is no persistence
  - This is not real authentication

## Entry Fee / Payment Status

- Current representation:
  - Static UI copy only
- Stored in:
  - `src/components/Home.jsx`
- Source files:
  - `src/components/Home.jsx`
- Created by:
  - Hardcoded text
- Read by:
  - Home page only
- Updated by:
  - Manual code change only
- Ownership / identity:
  - Not attached to a submission
- Notes:
  - No payment or paid/unpaid field exists in backend schema

## Suggestion / Off-season Feedback

- Current representation:
  - External Google Form submission
- Stored in:
  - Google Forms endpoint, not in Amplify
  - local cooldown timestamp in browser `localStorage`
- Source files:
  - `src/components/WinnersPodium.jsx`
- Created by:
  - Off-season suggestion form submit
- Read by:
  - Not read back into the app
- Updated by:
  - New submissions only
- Ownership / identity:
  - No authenticated identity in app
- Notes:
  - Cooldown key: `bowlSuggestionsCooldownUntil`

## Clips / Media

- Status:
  - No clip or media-caching feature found in current app code
- Notes:
  - Existing static assets are logos, medals, mock JSON, and CSV examples only

## Chat / Messages

- Status:
  - No chat or message entity found in current app code or Amplify backend

## Admin Controls

- Status:
  - No dedicated admin entity, role, protected route, or backend role model found
- Implied manual controls:
  - `isBowlSeason`
  - `picksClosed`
  - `AWS_DISABLED`
  - hardcoded winners/prize text
