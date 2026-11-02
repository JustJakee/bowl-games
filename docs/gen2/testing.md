# Automated checks and staging simulation

[Index](README.md)

## Automated test map

Run commands from `leaderboard`. `npm test` chains the focused suites below;
the current application has real tests despite the older frontend README's
previous placeholder description.

| Script | Main coverage |
| --- | --- |
| `test:entry` | Entry repository, validation, canonical selection |
| `test:picks` | Single-entry workflow, persistence, partial failures, autosave ordering, loading, deselection, lock state |
| `test:leaderboard` | Leaderboard/admin entry loading and scoring |
| `test:schedule` | Game pick splits and guarded read projections |
| `test:dashboard` | Entry progress, scoreboard games, admin game validation |
| `test:seed:test26` | Fixture generation and guarded seed behavior |
| `test:secure-picks` | Server deadlines, ownership, entry limits, visibility |
| `test:registration` | Verified-registration and approval rules |
| `test:season-experience` | Lifecycle presentation, previous-season choice, legacy history |

Backend rule/seed tests use Node's test runner; frontend-oriented suites use
`tsx --test`. Check `package.json` for the current exact file lists.

Registration also runs production-handler/frontend contract tests. The offline
synthesis step validates generated registration GraphQL arguments and dispatch
templates, then replays the generated Lambda request payload through those
tests. See the [dispatch regression](../backend/gen2-registration-dispatch-fix.md).

Secure-picks also runs real-handler contract tests for all four operations.
Synthesis verifies their schema arguments, player-group authorization stages,
pipeline invocation linkage, and generated payloads before replaying those
payloads through the tests. The custom Lambda field inventory must remain covered.
See the [secure-picks follow-up](../backend/gen2-secure-picks-dispatch-fix.md).

Additional checks:

```bash
npm run amplify:typecheck
npx --no-install tsc --project amplify/tsconfig.json --noEmit
npm run build
git diff --check
```

Use [deployment preflight](deployment.md) for the full ordered check including
offline synthesis. Avoid running `preflight:gen2` while another install or dev
process is modifying `node_modules`.

## Simulated seasons

The seed uses mock bowl data to create one Season, one SeasonConfig, and 54 Game
records. It does not create Cognito users, profiles, player entries, or picks.
Those go through normal application workflows.

- `test26` is the original deterministic fixture namespace.
- `test26-r2` is the isolated regression namespace for the updated single-entry
  security workflow. The full regression uses five player accounts rather than
  multiple entries from one account.
- Schedule timestamps are generated relative to an explicit start time.
- The fixture is for staging, not a way to populate production by changing an ID.

## Safe operational sequence

1. Read [test26-local-seed.md](../backend/test26-local-seed.md) and
   [test26-r2-regression.md](../backend/test26-r2-regression.md).
2. Authenticate the documented profile and positively verify the staging target.
3. Retrieve outputs into the isolated ignored location with
   `npm run seed:test26:outputs`; this script does not overwrite app-root outputs.
4. Supply required admin application credentials only in the current shell.
5. Run `seed:test26:dry-run` or `seed:test26-r2:dry-run` and review its plan.
6. Run the corresponding apply only when the reviewed mutation is intended.
7. Select the matching season slug in the frontend and use normal player flows.

The seed checks account, region, branch, backend/API/user-pool identities, model
introspection, and expected mutation fields. Reset and apply commands mutate
staging data; documentation work and ordinary startup do not require them.

If deployment changes the schema, stop and review the pinned schema baseline
before applying a seed/reset. See the runbooks for exact flags, environment
variables, reset behavior, and expected counts.

## Live scenarios that matter

- Register, confirm email, remain pending, approve as admin, refresh tokens.
- Verify pending/non-admin callers cannot invoke privileged operations directly.
- Create one entry per player, save partial picks, reload, complete the card,
  deselect a pick, and exercise a failed/partial save.
- Verify direct generated player Entry/Pick writes fail.
- Verify guarded saves reject wrong owner/season/game, duplicates, and late writes.
- Use two players to test raw list/index/relationship privacy before kickoff.
- Verify visible selections reveal per game at kickoff and tiebreakers reveal
  only at the championship boundary.
- Progress Pending → Picks Open → Locked → In Progress → Final with admin access
  available throughout. Keep stored status and configured deadlines coherent.
- Verify test-game results update player records, splits, leaderboard, and history.
- Verify payment fields remain private and player writes cannot alter them.

## Evidence limits

The release-remediation note records a prior 139-test pass at its own milestone;
that is not the current suite count or a new run performed for these notes.
The 2026-11-02 laptop setup verified dependency installation, STS identity,
staging output retrieval, and a passing frontend build. It did not run the full
preflight, browser tests, approval flow, or a staging simulation.

Local tests cannot establish deployed authorization, actual IAM scope, Cognito
email delivery, generated API response shapes, or safe resource replacements.
Record exact commits and observed results whenever those checks are completed.
