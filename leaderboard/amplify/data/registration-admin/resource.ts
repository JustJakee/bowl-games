import { defineFunction } from "@aws-amplify/backend";

export const registrationAdmin = defineFunction({
  name: "registration-admin",
  entry: "./handler.js",
  timeoutSeconds: 30,
});
