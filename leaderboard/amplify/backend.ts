import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

/**
 * Amplify Gen 2 staging backend foundation.
 *
 * This branch is intended for a separate staging Amplify Console app and must
 * not replace the current production Gen 1 app or domain wiring.
 *
 * Data resources are intentionally deferred in this PR so the first staging
 * branch can be reviewed as a minimal, low-risk backend transition step.
 */
defineBackend({
  auth,
});
