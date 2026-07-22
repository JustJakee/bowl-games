// Standalone Node has no browser cookie document. Amplify's default storage falls back to
// process-local memory, which keeps Cognito tokens available to fetchAuthSession in this process.
export const configureAmplifyForNode = ({ amplify, outputs }) => {
  amplify.configure(outputs);
};
