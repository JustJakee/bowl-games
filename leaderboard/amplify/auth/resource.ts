import { defineAuth } from "@aws-amplify/backend";

/**
 * Email/password auth only.
 *
 * Product and cost constraints for this PR:
 * - no phone sign-in
 * - no SMS auth
 * - no SMS MFA
 * - lowercase Cognito groups only
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["player", "admin"],
});
