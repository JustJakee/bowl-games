# Amplify Gen 2 Backend

This directory contains the new Amplify Gen 2 backend for the staging branch workflow.

Notes:

- This is intended for a separate staging Amplify app first.
- Do not use this branch to cut over the current production domain.
- The preserved Gen 1 backend config now lives under `leaderboard/amplify-gen1-legacy/`.
- This PR includes auth foundation only. The target data models are deferred to the next backend PR.
