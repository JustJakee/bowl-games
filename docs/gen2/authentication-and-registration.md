# Authentication, approval, and profiles

[Index](README.md)

## Authentication foundation

[Auth resource](../../leaderboard/amplify/auth/resource.ts) defines email/password
login and lowercase `player`/`admin` groups. This implementation does not add
phone sign-in, SMS authentication, or SMS MFA.

[AuthContext](../../leaderboard/src/auth/AuthContext.jsx) restores Cognito tokens
before exposing an authenticated state. It reads `cognito:groups` from the
access token, falling back to the ID token; `admin` takes precedence over
`player`. A signed-in account can have a null role while awaiting approval.

Amplify Hub events resynchronize sign-in, sign-out, and refreshed sessions.
Background refresh retains a usable authenticated session instead of clearing
data providers and remounting the active route. Sign-out clears local auth state.

## New-account flow

1. A visitor registers with email/password in `AuthShell`.
2. Cognito sends an email confirmation code.
3. Confirming the email does **not** assign the player group.
4. The user signs in and sees **Awaiting administrator approval**.
5. An administrator uses **Admin → Approvals** to approve the verified account.
6. **Check approval** forces a fresh session so tokens reflect new membership.
7. Approved users complete profile onboarding before entering the application.

Password reset and new-password flows remain in the auth UI. Profile data or
`preferredGroup` never grants Cognito group membership.

## Approval implementation

- [registrationRepository.js](../../leaderboard/src/data/registrationRepository.js)
  calls admin-only AppSync operations.
- [registration-admin/handler.js](../../leaderboard/amplify/data/registration-admin/handler.js)
  lists Cognito users with pagination, checks groups, and sorts pending accounts
  by creation time.
- A pending registration must be `CONFIRMED`, have `email_verified=true`, have an
  email, and belong to neither `player` nor `admin`.
- Approval rechecks the user and groups, rejects administrator accounts, and
  adds only the fixed `player` group. Already-approved players are handled
  idempotently.
- Both AppSync authorization and the Lambda's `assertAdminIdentity` protect
  approval operations.
- Auth grants the function `ListUsers`, `AdminGetUser`,
  `AdminListGroupsForUser`, and `AdminAddUserToGroup`, scoped through the auth
  resource. Verify the actual deployed policy before release.

The separate function resource is in
[registration-admin/resource.ts](../../leaderboard/amplify/data/registration-admin/resource.ts).
Its environment uses `$amplify/env/registration-admin` for the user-pool ID.

## Profile onboarding

[UserProfileContext](../../leaderboard/src/auth/UserProfileContext.jsx) and the
`ProfileGate` in [AuthShell](../../leaderboard/src/components/AuthShell.jsx)
handle missing, loading, error, and ready profile states.

[userProfile.js](../../leaderboard/src/auth/userProfile.js) loads by owner,
checks username availability by normalized key, and creates the profile.
Usernames are trimmed, 3–20 characters, and limited to letters, digits,
underscores, and hyphens. The lookup key is lowercase.

The availability check is client-side and is not a race-safe username
reservation. Owner authorization, private email rules, and public display
fields remain separate from Cognito membership.

## Verification boundaries

Local rule tests cover verification eligibility, admin identity checks,
approval behavior, and rejection paths. They do not prove actual email delivery,
deployed IAM permissions, token propagation, or live AppSync authorization.

Use the [registration staging plan](../backend/gen2-registration-season-pending.md)
to verify pending-user API denial, approval, token refresh, profile access,
and continued admin access through season-state transitions.
