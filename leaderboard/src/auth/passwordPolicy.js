// Keep this in sync with the effective policy in amplify/auth/resource.ts.
// That resource does not override Amplify Auth's default Cognito policy.
const COGNITO_SYMBOLS = "^$*.[]{}()?-\"!@#%&/\\,><':;|_~`+=";

export const PASSWORD_REQUIREMENTS = Object.freeze([
  {
    id: "minimum-length",
    label: "At least 8 characters",
    isSatisfied: (password) => password.length >= 8,
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    isSatisfied: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    isSatisfied: (password) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    isSatisfied: (password) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "One symbol",
    isSatisfied: (password) =>
      Array.from(password).some((character) =>
        COGNITO_SYMBOLS.includes(character),
      ),
  },
]);

export const evaluatePasswordRequirements = (password = "") =>
  PASSWORD_REQUIREMENTS.map(({ id, label, isSatisfied }) => ({
    id,
    label,
    satisfied: isSatisfied(password),
  }));

export const passwordMeetsPolicy = (password = "") =>
  PASSWORD_REQUIREMENTS.every(({ isSatisfied }) => isSatisfied(password));
