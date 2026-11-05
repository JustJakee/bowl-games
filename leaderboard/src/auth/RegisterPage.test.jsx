import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import RegisterPage from "./RegisterPage.jsx";
import {
  evaluatePasswordRequirements,
  PASSWORD_REQUIREMENTS,
  passwordMeetsPolicy,
} from "./passwordPolicy.js";

test("password requirements match the configured Amplify Cognito policy", () => {
  assert.deepEqual(
    PASSWORD_REQUIREMENTS.map(({ id, label }) => ({ id, label })),
    [
      { id: "minimum-length", label: "At least 8 characters" },
      { id: "lowercase", label: "One lowercase letter" },
      { id: "uppercase", label: "One uppercase letter" },
      { id: "number", label: "One number" },
      { id: "symbol", label: "One symbol" },
    ],
  );
});

test("password requirements evaluate live values independently", () => {
  const result = Object.fromEntries(
    evaluatePasswordRequirements("Bowl2026").map(({ id, satisfied }) => [
      id,
      satisfied,
    ]),
  );

  assert.deepEqual(result, {
    "minimum-length": true,
    lowercase: true,
    uppercase: true,
    number: true,
    symbol: false,
  });
  assert.equal(passwordMeetsPolicy("Bowl2026!"), true);
  assert.equal(passwordMeetsPolicy("Bowl2026_"), true);
  assert.equal(passwordMeetsPolicy("Bowl2026🏈"), false);
  assert.equal(passwordMeetsPolicy("bowl2026!"), false);
});

test("registration renders persistent requirements and both visibility controls", () => {
  const markup = renderToStaticMarkup(
    <RegisterPage onBack={() => {}} onSubmit={async () => {}} />,
  );

  assert.match(markup, /aria-label="Password requirements"/);
  assert.equal(markup.match(/: not met/g)?.length, 5);
  assert.equal(markup.match(/aria-label="Show password"/g)?.length, 2);
});

test("password requirements keep the form spacing below the password field", () => {
  const source = readFileSync(
    new URL("./RegisterPage.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /mt:\s*"-8px !important"/);
  assert.match(
    source,
    /<PasswordRequirementsChecklist password=\{password\} \/>/,
  );
});

test("registration preserves independent toggles, mismatch feedback, and submit contract", () => {
  const registerSource = readFileSync(
    new URL("./RegisterPage.jsx", import.meta.url),
    "utf8",
  );
  const shellSource = readFileSync(
    new URL("../components/AuthShell.jsx", import.meta.url),
    "utf8",
  );

  assert.match(registerSource, /showPassword, setShowPassword/);
  assert.match(registerSource, /showConfirmPassword, setShowConfirmPassword/);
  assert.match(
    registerSource,
    /confirmTouched && password !== confirmPassword/,
  );
  assert.match(
    registerSource,
    /await onSubmit\(\{ email: email\.trim\(\)\.toLowerCase\(\), password \}\)/,
  );
  assert.doesNotMatch(shellSource, /Username key:/);
  assert.doesNotMatch(shellSource, /<Chip/);
});
