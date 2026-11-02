// AUTH — AUTHENTICATION — COGNITO
import { defineAuth } from "@aws-amplify/backend";
import { registrationAdmin } from "../data/registration-admin/resource.ts";

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
  // Email confirmation alone never adds a group. Only the admin operation can
  // grant player membership to a verified account.
  access: (allow) => [
    allow.resource(registrationAdmin).to(["listUsers", "getUser", "listGroupsForUser", "addUserToGroup"]),
  ],
});
