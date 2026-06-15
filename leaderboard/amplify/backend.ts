import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.ts";
import { data } from "./data/resource.ts";

/**
 * Amplify Gen 2 staging backend foundation.
 *
 * This branch is intended for a separate staging Amplify Console app and must
 * not replace the current production Gen 1 app or domain wiring.
 *
 * Data resources are staged here for the Gen 2 backend only. Production Gen 1
 * resources remain preserved under `leaderboard/amplify-gen1-legacy/`.
 */
defineBackend({
  auth,
  data,
});
