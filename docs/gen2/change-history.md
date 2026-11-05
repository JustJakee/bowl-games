# Gen 2 change history

[Index](README.md) · Covers the branch through `e915e2f`.

This is a source-history map, not a deployment log. Hashes identify the relevant
repository milestones; inspect `git show <hash>` for exact diffs. Intermediate
mock UI commits are recorded as development history, not current data behavior.

## Backend foundation and frontend migration

| Commits                         | Change                                                  |
| ------------------------------- | ------------------------------------------------------- |
| `adfd09d`                       | Prepare separate Gen 2 staging backend; preserve Gen 1  |
| `a8650cb`, `916f7ed`            | Add hosting build configuration and fix resource import |
| `6c1b486`, `fe056c0`            | Establish/update Gen 2 data shapes                      |
| `dd7a1b8`                       | Add authenticated application shell                     |
| `af46695`                       | Migrate CRA to Vite                                     |
| `714de36`                       | Package cleanup and build fixes                         |
| `1755674`, `e1597d1`, `45da0b9` | Profile onboarding and related build fixes              |

## Application shell and backend integration

| Commits                         | Change                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| `7a4a180`                       | React Router, dashboard, broad application UI redesign     |
| `9099368`                       | Temporary fake-user development state                      |
| `028691a`, `b15ed5d`            | Desktop auth UI and login cleanup                          |
| `06f27b4`, `2252122`, `931e603` | Mock-data UI iteration and Picks workspace                 |
| `534b45d`                       | Route scroll-to-top behavior                               |
| `d48b7b8`                       | Connect frontend workflows to backend                      |
| `9e8bca5`, `2e47f85`            | Local auth cleanup, formatting, source documentation       |
| `a31828a`                       | Explicit TypeScript resource imports                       |
| `ae8fa49`, `7b38e3a`            | Payment field authorization and owner identity-claim fixes |
| `cdc9045`                       | Schema documentation                                       |

## Persistent player workflows

| Commits              | Change                                                   |
| -------------------- | -------------------------------------------------------- |
| `cd88e0f`            | Guarded test26 season seeding                            |
| `6ed8cc9`            | Entry creation and persistent draft picks                |
| `cd676bb`            | Season-wide pick locking                                 |
| `553d325`            | Correct loading state when selected entry changes        |
| `a7b87cc`            | Soft delete entries; prevent admin competition entries   |
| `48f7418`, `cec2413` | Schedule redesign and dashboard cleanup                  |
| `6839259`            | Leaderboard redesign                                     |
| `fd66ee2`            | Complete/race-safe persistence and partial-save handling |
| `9593237`            | One canonical entry per player                           |
| `e380b19`            | Persist deselection correctly                            |
| `d4baeb7`, `67e2ef3` | Responsive cleanup and locked-picks view overhaul        |

## Admin, security, and release validation

| Commits              | Change                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `c4e5aa1`            | Add explicit `isTestSeason`                                                                                                           |
| `c1a2a88`, `e5ebdbb` | Test-season configuration and admin game UI                                                                                           |
| `b3d099e`, `f34b0f3` | Score presentation and final-card cleanup                                                                                             |
| `262a798`            | Guarded player writes, server deadline/ownership validation, pre-kickoff privacy, single-entry enforcement, isolated regression setup |
| `4379f9f`            | Fix Lambda generated environment-module resolution                                                                                    |
| `774ea35`, `7c095e6` | Fix backend TypeScript imports and add staging preflight/synthesis checks                                                             |
| `e915e2f`            | Admin registration approval, Season Pending, and historical results behavior                                                          |

## 2026-11-02 local setup and documentation

- Installed locked application dependencies on the new laptop.
- Verified the existing AWS profile against the documented staging account.
- Found that the installed Amplify CLI SDK could not read the newer `aws login`
  profile, despite successful AWS CLI authentication.
- Generated staging outputs by passing exported temporary credentials directly
  to the Amplify child process environment.
- Verified `npm run build`; local Vite port binding was permission-blocked.
- Added this modular documentation set from checked-in code and existing
  operational notes. No deployment, seeding, reset, or production cutover was
  performed as part of these setup/documentation tasks.

For future milestones, add the commit, resulting behavior, affected topic notes,
and verification evidence. Keep actual AWS deployment results distinguishable
from code implementation and local test results.
