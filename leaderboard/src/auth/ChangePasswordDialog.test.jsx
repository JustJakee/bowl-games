import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PasswordRequirementsChecklist from "./PasswordRequirementsChecklist.jsx";
import {
  getChangePasswordErrorMessage,
  submitChangePassword,
  validateChangePassword,
} from "./ChangePasswordDialog.jsx";

test("change password validation requires every field and the shared policy", () => {
  const empty = validateChangePassword({});
  const weak = validateChangePassword({
    currentPassword: "OldPass1!",
    newPassword: "weak",
    confirmPassword: "weak",
  });

  assert.equal(empty.currentRequired, true);
  assert.equal(empty.newRequired, true);
  assert.equal(empty.confirmRequired, true);
  assert.equal(empty.valid, false);
  assert.equal(weak.newPolicy, true);
  assert.equal(weak.valid, false);
});

test("change password validation rejects mismatch and current-password reuse", () => {
  const mismatch = validateChangePassword({
    currentPassword: "OldPass1!",
    newPassword: "NewPass2!",
    confirmPassword: "Different3!",
  });
  const reused = validateChangePassword({
    currentPassword: "SamePass1!",
    newPassword: "SamePass1!",
    confirmPassword: "SamePass1!",
  });
  const valid = validateChangePassword({
    currentPassword: "OldPass1!",
    newPassword: "NewPass2!",
    confirmPassword: "NewPass2!",
  });

  assert.equal(mismatch.mismatch, true);
  assert.equal(mismatch.valid, false);
  assert.equal(reused.sameAsCurrent, true);
  assert.equal(reused.valid, false);
  assert.equal(valid.valid, true);
});

test("shared password checklist evaluates values live", () => {
  const partial = renderToStaticMarkup(
    <PasswordRequirementsChecklist password="Bowl2026" />,
  );
  const complete = renderToStaticMarkup(
    <PasswordRequirementsChecklist password="Bowl2026!" />,
  );

  assert.equal(partial.match(/: met/g)?.length, 4);
  assert.equal(partial.match(/: not met/g)?.length, 1);
  assert.equal(complete.match(/: met/g)?.length, 5);
  assert.doesNotMatch(complete, /: not met/);
});

test("valid submission invokes Amplify's update shape exactly once", async () => {
  const calls = [];
  const result = await submitChangePassword({
    currentPassword: "OldPass1!",
    newPassword: "NewPass2!",
    confirmPassword: "NewPass2!",
    updatePasswordAction: async (input) => calls.push(input),
  });

  assert.deepEqual(calls, [
    { oldPassword: "OldPass1!", newPassword: "NewPass2!" },
  ]);
  assert.deepEqual(result, { ok: true });
});

test("invalid submission never invokes the password update API", async () => {
  let calls = 0;
  const result = await submitChangePassword({
    currentPassword: "",
    newPassword: "weak",
    confirmPassword: "different",
    updatePasswordAction: async () => {
      calls += 1;
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.validation.valid, false);
});

test("Cognito failures return safe actionable messages", async () => {
  const incorrect = await submitChangePassword({
    currentPassword: "WrongPass1!",
    newPassword: "NewPass2!",
    confirmPassword: "NewPass2!",
    updatePasswordAction: async () => {
      const error = new Error("Incorrect username or password.");
      error.name = "NotAuthorizedException";
      throw error;
    },
  });

  assert.equal(incorrect.ok, false);
  assert.equal(incorrect.errorMessage, "Your current password is incorrect.");
  assert.equal(
    getChangePasswordErrorMessage({
      name: "UserUnAuthenticatedException",
    }),
    "Your session has expired. Sign in again before changing your password.",
  );
  assert.equal(
    getChangePasswordErrorMessage({ name: "LimitExceededException" }),
    "Too many attempts. Wait a moment and try again.",
  );
});

test("dialog preserves independent visibility, lifecycle, and responsive safeguards", () => {
  const source = readFileSync(
    new URL("./ChangePasswordDialog.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /showCurrentPassword, setShowCurrentPassword/);
  assert.match(source, /showNewPassword, setShowNewPassword/);
  assert.match(source, /showConfirmPassword, setShowConfirmPassword/);
  assert.match(source, /if \(submissionInFlightRef\.current\) return/);
  assert.match(source, /disabled=\{!validation\.valid \|\| submitting\}/);
  assert.match(source, /fullScreen=\{fullScreen\}/);
  assert.match(source, /maxWidth: \{ sm: 500 \}/);
  assert.match(source, /resetForm\(\);\s+onClose\(\);\s+onSuccess\(SUCCESS_MESSAGE\)/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage/);
});
