# Gen 2 pre-deployment validation

Run this from a clean `gen2-updates` checkout before approving another staging push:

```powershell
cd leaderboard
npm run preflight:gen2
```

The command runs, in order, `npm ci`, the automated tests, the existing root Amplify
TypeScript check, `tsc --project amplify/tsconfig.json --noEmit`, local backend
synthesis with Lambda bundling and Amplify's post-synthesis TypeScript compiler,
the production frontend build, and staged plus unstaged Git whitespace checks.
It stops on the first failure. Compare its printed Node version with the Amplify build
environment; `amplify.yml` does not select a Node version, and the November 1
build log did not print one.

The backend-local TypeScript check matters because Amplify's deployer reads
`amplify/tsconfig.json`. Both configurations must permit the explicit `.ts`
imports used by `amplify/backend.ts`. The November 1 staging build showed that
extensionless local imports can pass TypeScript and local synthesis yet fail in
the CI CDK assembly loader with `Cannot find module './auth/resource'`.
The synthesis probe checks local backend imports for an explicit `.ts` suffix
before loading the backend, so this failure is caught even if the local Node
loader happens to accept extensionless paths.

The synthesis probe uses the installed, lockfile-pinned Amplify and CDK code paths
to create the generated `secure-picks` environment module and bundle the Lambda.
It does not call `ampx pipeline-deploy` or `ampx sandbox`, create AWS resources,
or keep generated artifacts. Amplify does not publish a non-deploying CLI command
for a complete Gen 2 backend synthesis; the probe uses package internals and must
be reevaluated if those packages change. It refuses to overwrite an existing
`.amplify` directory or `tmp/gen2-offline-synth` output.

## Review checklist

1. Read the **complete** latest Amplify log. Record its exact failing command,
   first fatal error, and build phase. Check the Amplify build environment for
   its Node/npm versions if the log does not print them.
2. Confirm the branch and review `git status`, `git diff --check`, changed files,
   and any secrets before staging or pushing.
3. Run `npm run preflight:gen2` from `leaderboard` on a Node version matching CI.
   Treat any failed step as a deployment blocker.
4. Check that `amplify.yml` still runs from the `leaderboard` app root and that
   `pipeline-deploy` will target only the staging app and branch.
5. Review the generated CloudFormation change set or deployment events in AWS
   before declaring infrastructure safe. Local synthesis cannot establish the
   live stack diff or IAM permissions.
6. After a permitted staging deployment, verify AppSync authorization, Lambda
   runtime access, and frontend behavior with staging accounts. Keep the seed
   and reset scripts separate from deployment validation.

Passing this local preflight does not verify AWS credentials, CloudFormation
deployment, live AppSync rules, Lambda invocation, branch configuration, or the
Amplify build image. Record those results separately.
