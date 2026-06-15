import { Amplify } from "aws-amplify";

let configurePromise;
let configured = false;
const OUTPUTS_PATH = `${process.env.PUBLIC_URL || ""}/amplify_outputs.json`;

class AmplifyOutputsUnavailableError extends Error {
  constructor() {
    super("Amplify outputs are not available for this environment.");
    this.name = "AmplifyOutputsUnavailableError";
  }
}

export async function configureAmplifyFromOutputs() {
  if (configured) {
    return true;
  }

  if (!configurePromise) {
    configurePromise = (async () => {
      const response = await fetch(OUTPUTS_PATH, { cache: "no-store" });

      if (!response.ok) {
        throw new AmplifyOutputsUnavailableError();
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new AmplifyOutputsUnavailableError();
      }

      const outputs = await response.json();
      Amplify.configure(outputs);
      configured = true;
      return true;
    })();
  }

  return configurePromise;
}
