# Amplify Gen 2 Backend

This directory contains the new Amplify Gen 2 backend for the staging branch workflow.

Notes:

- This is intended for a separate staging Amplify app first.
- Do not use this branch to cut over the current production domain.
- The preserved Gen 1 backend config now lives under `leaderboard/amplify-gen1-legacy/`.
- This branch now defines the Gen 2 auth and data resources for staging.
- Raw model reads stay conservative:
  - `Season` and `Game` allow authenticated read access plus admin write access.
  - `Entry`, `Pick`, `UserProfile`, `AdminAction`, and `ArchivedSubmission` are not publicly readable.
- `Entry.entryName` uniqueness is only partially supported in schema form through
  `entryNameKey` plus a season/name index. Enforcing uniqueness only among
  non-deleted entries still requires later server-side validation.
- `AdminAction` disables update and delete mutations to keep the generated API
  append-only at the schema level. Future admin service logic should still
  avoid any out-of-band record rewrites.
