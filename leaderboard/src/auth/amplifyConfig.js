import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";

// Static imports execute before application modules use Auth or Data. Keeping
// configuration and client creation together prevents an unconfigured client.
Amplify.configure(outputs);

export const dataClient = generateClient();

export async function configureAmplifyFromOutputs() {
  return true;
}
