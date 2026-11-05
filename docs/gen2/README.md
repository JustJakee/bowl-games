# Gen 2 development notes

Current implementation snapshot: **2026-11-02**, through commit `e915e2f`.
These notes describe the checked-in implementation and the local setup verified
in this session. They do not certify that every feature has passed live staging
validation or that production has migrated.

## Start here

| Topic                                                      | Notes                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Architecture, migration boundaries, source map             | [Architecture](architecture.md)                                       |
| Models, indexes, authorization                             | [Data and authorization](data-and-authorization.md)                   |
| Sign-up, approval, sessions, profiles                      | [Authentication and registration](authentication-and-registration.md) |
| Single entry, persistence, autosave, server guards         | [Entries and picks](entries-and-picks.md)                             |
| Season lifecycle, deadlines, previous results              | [Seasons and history](seasons-and-history.md)                         |
| Routes, responsive layouts, dashboard, schedule, standings | [Frontend and scoring](frontend-and-scoring.md)                       |
| Payments, test-season game management, approvals           | [Admin workflows](admin-workflows.md)                                 |
| Laptop setup, AWS configuration, local startup             | [Local development](local-development.md)                             |
| Hosting, generated outputs, build fixes, preflight         | [Deployment](deployment.md)                                           |
| Automated checks, staging simulation, evidence limits      | [Testing](testing.md)                                                 |
| Migration milestones and commit references                 | [Change history](change-history.md)                                   |
| Remaining work and known implementation limits             | [Future development](future-development.md)                           |

## Status at this snapshot

- Gen 2 auth, data models, custom Lambda operations, and frontend integration
  are implemented in the repository.
- The frontend uses Vite, React 18, React Router, and a shared Amplify Data client.
- The documented staging target is app `d1mqezo38x3xb8`, branch `gen2-updates`,
  region `us-east-2`. Existing operational docs retain the other target identifiers.
- The preserved Gen 1 resources remain in `leaderboard/amplify-gen1-legacy/`.
  Production cutover and historical data migration are separate work.
- On the new laptop, dependencies installed, AWS identity verification succeeded,
  staging outputs were generated, and `npm run build` passed.
- Local server startup was blocked by the tool session's port permission. Browser
  sign-in, approval, and data access were not verified in that session.
- Registration approval and Season Pending are in the latest commit; use their
  [staging checklist](../backend/gen2-registration-season-pending.md) before
  treating deployment behavior as verified.

## Existing operational references

The focused notes above complement, rather than replace, these runbooks:

- [Gen 2 pre-deployment validation](../backend/gen2-predeployment-preflight.md)
- [Release security remediation](../backend/gen2-release-blocker-remediation.md)
- [Registration and Season Pending staging plan](../backend/gen2-registration-season-pending.md)
- [Guarded test26 seed](../backend/test26-local-seed.md)
- [test26-r2 regression](../backend/test26-r2-regression.md)
- [Detailed simulation guide](../TESTING.md)
- [Initial Console deployment milestone](../backend/amplify-gen2-console-deploy.md)
  is historical and predates the data layer, Vite, and frontend integration.

## Keeping these notes useful

Keep each file below **500 lines**. Split a topic and update this index before
it grows beyond that limit. Record behavior, source paths, constraints, and how
to verify changes. Keep implemented behavior separate from planned features and
deployment evidence. Update the snapshot date and relevant topic when behavior
changes; add significant decisions to the change history.

Do not copy generated outputs, credentials, tokens, user emails, or passwords
into these notes. Repository-relative source links make the notes portable.
