# Implementation Roadmap

## Recommended PR order

1. `docs: target data model and auth ownership rules`
2. `backend: create Amplify Gen 2 sandbox backend`
3. `backend: add Cognito auth and player/admin groups`
4. `backend: add target data models and authorization rules`
5. `frontend: add auth shell and session persistence`
6. `frontend: add player dashboard and account-owned entries`
7. `frontend: add pick editing and draft saving`
8. `frontend: add admin dashboard and audited corrections`
9. `migration: archive legacy submissions`
10. `frontend: migrate CRA to Vite`
11. `cleanup: remove Gen 1 artifacts and stale dependencies`

## 1. `docs: target data model and auth ownership rules`

### Purpose

Lock the target architecture before backend or frontend implementation starts.

### Files likely touched

- `docs/design/target-data-model.md`
- `docs/design/auth-ownership-rules.md`
- `docs/design/admin-corrections.md`
- `docs/design/cost-guardrails.md`
- `docs/design/implementation-roadmap.md`
- possibly `README.md` if a short pointer is later desired

### Acceptance criteria

- Target entities are documented.
- Ownership and auth rules are documented.
- Admin correction audit requirements are documented.
- Migration stance for legacy submissions is documented.

### Risks

- Design decisions may still shift if product requirements change.

### Rollback notes

- Documentation-only PR; revert docs if decisions change.

## 2. `backend: create Amplify Gen 2 sandbox backend`

### Purpose

Introduce a safe Gen 2 sandbox backend path without cutting over production.

### Files likely touched

- New Amplify Gen 2 backend definition files under `leaderboard/` or chosen app root
- generated config artifacts for sandbox only
- backend README/setup docs

### Acceptance criteria

- Gen 2 sandbox can deploy independently from current Gen 1 production resources.
- No production cutover occurs.
- Current CRA app behavior remains unchanged unless pointed to sandbox intentionally.

### Risks

- Confusion between Gen 1 and Gen 2 config artifacts.
- Accidental mixing of live and sandbox resource IDs.

### Rollback notes

- Remove or disable sandbox backend config without affecting Gen 1 production resources.

## 3. `backend: add Cognito auth and player/admin groups`

### Purpose

Create the target authentication foundation before account-owned data flows are added.

### Files likely touched

- Gen 2 auth/backend definition files
- generated auth config outputs
- backend documentation for local/dev auth setup

### Acceptance criteria

- Cognito auth exists in sandbox.
- Groups `player` and `admin` are defined consistently.
- Admin login path is possible.
- No SMS auth or SMS MFA is enabled.

### Risks

- Group naming inconsistency.
- Overly broad default auth rules.

### Rollback notes

- Remove sandbox auth resources or revert backend definition PR before production usage.

## 4. `backend: add target data models and authorization rules`

### Purpose

Create `UserProfile`, `Season`, `Game`, `Entry`, `Pick`, `AdminAction`, `ArchivedSubmission`, and config models with ownership rules.

### Files likely touched

- Gen 2 data/backend definition files
- generated model/config artifacts
- backend seed or fixture scripts if added

### Acceptance criteria

- Live models exist with durable relationships.
- Picks reference `gameId`, not bowl-name JSON keys.
- Private versus public data boundaries are enforced.
- Admin audit model exists.

### Risks

- Auth rules may be too permissive or too restrictive.
- Model design may need iteration once frontend usage starts.

### Rollback notes

- Revert sandbox model definitions before production cutover.

### Checkpoint: backend authorization review

- Confirm public reads cannot expose emails, payment status, user IDs, or admin logs.
- Confirm players cannot read or mutate other players' entries.
- Confirm `AdminAction` is append-only.
- Confirm admin correction writes cannot bypass audit requirements.

## 5. `frontend: add auth shell and session persistence`

### Purpose

Replace the hardcoded frontend pseudo-login with real auth shell behavior and refresh persistence.

### Files likely touched

- `leaderboard/src/App.js`
- `leaderboard/src/index.js`
- new auth provider/session utilities
- home/login-related UI components
- config import/setup files

### Acceptance criteria

- Users can sign in with real auth in sandbox.
- Session persists across page refresh.
- Admin and player roles can be distinguished in client state.
- Hardcoded `bobs` / `picks` gate is removed or isolated from active flow.

### Risks

- Auth state can leak into public pages and break existing public views.
- Refresh persistence edge cases can create confusing locked/unlocked state.

### Rollback notes

- Keep public pages working without auth-only hard dependency until the new flow is stable.

## 6. `frontend: add player dashboard and account-owned entries`

### Purpose

Move players from anonymous submissions to account-owned entries.

### Files likely touched

- entry creation/edit UI
- dashboard pages/components
- data hooks/services for `UserProfile`, `Entry`, and `Pick`
- route/state/navigation logic

### Acceptance criteria

- Logged-in players can see only their own entries in self-service areas.
- One player can create multiple entries.
- Public leaderboard remains visible.
- Private fields are not exposed publicly.

### Risks

- Mixing public leaderboard reads with private account entry reads.
- Entry naming and ownership edge cases.

### Rollback notes

- Keep public leaderboard independent so private dashboard changes can be rolled back without taking down the public site.

## 7. `frontend: add pick editing and draft saving`

### Purpose

Add the editable-until-lock flow and draft persistence.

### Files likely touched

- pick form components
- entry detail/editor components
- draft-saving utilities
- backend integration code for `Entry` and `Pick`

### Acceptance criteria

- Players can save drafts in progress.
- Players can edit their own entries until lock.
- Locked entries become read-only for players.
- Lock behavior is driven by backend season/game state.

### Risks

- Race conditions near lock time.
- Confusion between draft state and submitted state.

### Rollback notes

- Disable draft mode or editable mode independently if needed while keeping read-only entry viewing intact.

## 8. `frontend: add admin dashboard and audited corrections`

### Purpose

Introduce the admin operational surface for corrections and post-lock overrides.

### Files likely touched

- new admin pages/components
- admin data hooks/services
- audit log UI
- guarded admin navigation

### Acceptance criteria

- Admin can search users and entries.
- Admin can fix display name, contact email, payment status, tie-breaker, and picks.
- Post-lock pick override uses a dedicated audited flow.
- Every admin write creates an `AdminAction`.

### Risks

- High-authority features can create major trust issues if auditing is incomplete.
- UI mistakes can make destructive actions too easy.

### Rollback notes

- Admin UI can be hidden behind role check while backend admin models remain in place.

## 9. `migration: archive legacy submissions`

### Purpose

Preserve existing Gen 1 `Submission` data as view-only archive history.

### Files likely touched

- migration scripts or import tooling
- archive model integration code
- archive/admin docs

### Acceptance criteria

- Legacy submissions are preserved.
- Legacy submissions are view-only by default.
- Legacy submissions are not automatically claimable by users.
- Archived emails remain private.

### Risks

- Incorrect field mapping from old JSON blobs.
- Bowl-name-based legacy picks may not normalize cleanly to new game IDs.

### Rollback notes

- Keep original Gen 1 source data untouched until archive import is validated.

## 10. `frontend: migrate CRA to Vite`

### Purpose

Modernize the frontend build after backend contracts and auth flows are stable.

### Files likely touched

- `leaderboard/package.json`
- Vite config files
- entry files such as `main.jsx`
- `public/index.html` replacement and asset paths
- test tooling config if added

### Acceptance criteria

- Frontend builds and runs under Vite.
- `/leaderboard/` deployment base behavior is explicitly handled if still required.
- Amplify config imports work in the new build.

### Risks

- Base path issues
- asset path regressions
- CSS ordering changes

### Rollback notes

- Keep migration in its own PR so CRA can remain the fallback until deployment is proven.

## 11. `cleanup: remove Gen 1 artifacts and stale dependencies`

### Purpose

Remove obsolete backend files and package drift after the new stack is stable.

### Files likely touched

- old `leaderboard/amplify/` Gen 1 files
- old generated GraphQL artifacts if replaced
- stale frontend dependencies in `leaderboard/package.json`
- obsolete constants and frontend flags

### Acceptance criteria

- Gen 1 artifacts no longer needed for operations are removed.
- Stale dependencies are pruned.
- Hardcoded season/auth flags are gone from active code.

### Risks

- Removing artifacts too early can break rollback paths.

### Rollback notes

- Do not take this PR until production has already stabilized on the new stack.

## Cross-PR implementation notes

- Keep legacy archive migration separate from first auth rollout.
- Do not combine Amplify Gen 2 migration, auth rollout, and Vite migration in one PR.
- Preserve public leaderboard behavior throughout the transition.
- Treat email and payment data as private from the start of backend redesign, not as a later hardening pass.

## Unknowns

- Exact file locations for Gen 2 backend definitions are Unknown until the implementation structure is chosen.
- Final frontend route structure is Unknown because the current app does not yet use a router.
