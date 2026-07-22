// CONFIG — AUTHENTICATION — AMPLIFY
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";

// Configure Amplify before creating the shared Data client so Auth and Data use the same outputs.
Amplify.configure(outputs);

export const dataClient = generateClient();

export async function configureAmplifyFromOutputs() {
  return true;
}
