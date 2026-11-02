# Local development and new-laptop setup

[Index](README.md) · Verified session: 2026-11-02

## Tools and application root

Install Git, Node.js with npm, and an editor. Backend configuration retrieval
also needs AWS CLI v2 and access to the staging AWS account.

The repository does not currently pin Node through `.nvmrc` or `amplify.yml`.
This session used Node `26.13.0`, npm `11.20.0`, and AWS CLI `2.39.3`; that is
local evidence, not a declared minimum or an exact match to the hosting image.

All application commands below run from:

```bash
cd /path/to/bowl-games/leaderboard
npm ci
```

`npm ci` uses the committed lockfile. It installs frontend and Gen 2 CLI
dependencies, including Vite and `ampx`. The global Gen 1 `amplify` CLI is not
needed for this checkout's Gen 2 workflow. Earlier setup advice to use
`amplify pull` applied to the older Gen 1 project, not this current branch.

## Verify AWS access

The existing laptop profile is named `bobs-bowl-games`:

```bash
aws --version
aws configure list-profiles
aws sts get-caller-identity --profile bobs-bowl-games --region us-east-2
```

Compare the returned account with the approved staging target in
[test26-local-seed.md](../backend/test26-local-seed.md). CLI credentials authorize
tooling; they do not sign the browser into the contest. Browser login uses a
Cognito application account and its player/admin membership.

## Retrieve existing staging configuration

With a credential profile supported by the installed Amplify SDK:

```bash
npx ampx generate outputs \
  --app-id d1mqezo38x3xb8 \
  --branch gen2-updates \
  --profile bobs-bowl-games \
  --out-dir .
```

This writes `leaderboard/amplify_outputs.json` for the existing deployed backend.
It does not deploy infrastructure or seed data. Keep it Git-ignored. The active
frontend imports this file directly, so it must exist before Vite can compile
the full application.

`prestart`, `predev`, and `prebuild` run `scripts/sync-amplify-outputs.js`, which
copies it to `public/amplify_outputs.json`. The runtime source of the current
shared client is the project-root import, not a dynamic fetch of the public copy.
Restart/rebuild after switching backend outputs.

## AWS CLI works but Amplify rejects credentials

Observed on this laptop: STS succeeded with an `aws login` profile, while
`ampx generate outputs --profile ...` failed with `InvalidCredentialError`.
The installed Node SDK could not load that profile's newer login credential
format. A fresh login was not necessary.

The successful workaround exported the existing temporary credentials into the
child process environment, without printing them or saving them in repository
files. Run this from `leaderboard` only if the normal command has that failure:

```bash
node <<'NODE'
const { spawnSync } = require('node:child_process');
const result = spawnSync('aws', [
  'configure', 'export-credentials', '--profile', 'bobs-bowl-games',
  '--format', 'process',
], { encoding: 'utf8' });
if (result.status !== 0) {
  process.stderr.write(result.stderr || 'AWS credential export failed.\n');
  process.exit(result.status || 1);
}
const credentials = JSON.parse(result.stdout);
const run = spawnSync('npx', [
  'ampx', 'generate', 'outputs', '--app-id', 'd1mqezo38x3xb8',
  '--branch', 'gen2-updates', '--out-dir', '.',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
    AWS_SESSION_TOKEN: credentials.SessionToken,
    AWS_REGION: 'us-east-2',
  },
});
if (run.error) throw run.error;
process.exit(run.status ?? 1);
NODE
```

## Start and verify

```bash
npm start
```

Open **http://localhost:5174**. `npm run dev` is equivalent. Vite uses a strict
port: if 5174 is occupied, stop the other server or deliberately change the port.

The default selected season is `test26`. To use the isolated regression season,
put this in the ignored `leaderboard/.env.local`, then restart Vite:

```dotenv
VITE_ACTIVE_SEASON_SLUG=test26-r2
```

The configured season must already exist in the selected backend. Do not seed
automatically to resolve a missing-season message; first verify the target and
use the guarded [simulation runbook](testing.md).

Check sign-in, approval/profile gates, dashboard, picks reload, schedule, and
standings with a staging Cognito account. Local editing can mutate the shared
staging backend; it is not an isolated offline database.

## Setup problems encountered

| Symptom | Resolution |
| --- | --- |
| `npm: command not found` | Install Node/npm and reopen Terminal; verify `node -v` and `npm -v` |
| Global npm `EACCES` under `/usr/local/lib/node_modules` | Use a user-owned npm prefix; see below |
| `aws: command not found` | Install AWS CLI v2 separately and reopen Terminal |
| `vite: command not found` despite node_modules existing | Run `npm ci` in `leaderboard`; dependencies were incomplete |
| Missing outputs | Generate staging outputs before compiling the app |
| `listen EPERM` in a restricted agent session | Start `npm start` directly in local Terminal, or grant port access |

The user-owned global prefix fix used during setup was:

```bash
mkdir -p "$HOME/.npm-global"
npm config set prefix "$HOME/.npm-global"
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

This is user-level configuration and can run outside the project. Add the PATH
line once. The project-local Gen 2 CLI still runs through `npx ampx`.

## Evidence from this session

- Dependency installation completed; npm reported peer/deprecation warnings and
  audit findings. No dependency upgrades or audit fixes were applied.
- AWS identity matched the documented staging account.
- Existing staging outputs were generated successfully with the credential bridge.
- `npm run build` passed, with bundle-size and mixed dynamic/static import warnings.
- Vite startup reached port binding, which the tool sandbox denied. The elevated
  startup request was rejected; no server was left running by the agent.
- Browser authentication and data workflows remain unverified in this session.
- No infrastructure deployment, seed, reset, or application-source edit was
  performed as part of local setup.
