import { useState } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import AuthFormLayout from "./AuthFormLayout";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { passwordMeetsPolicy } from "./passwordPolicy.js";
import PasswordRequirementsChecklist from "./PasswordRequirementsChecklist.jsx";

/**
 * Builds the `slotProps.input` config for a password field with a
 * show/hide toggle button.
 *
 * @param {boolean} visible - Whether the password text is currently shown.
 * @param {Function} onToggle - Callback that flips the visibility state.
 * @returns {{ endAdornment: JSX.Element }} Props to pass as `slotProps.input`.
 */
const passwordToggleInput = (visible, onToggle) => ({
  endAdornment: (
    <InputAdornment position="end">
      <IconButton
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={onToggle}
        edge="end"
      >
        {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
      </IconButton>
    </InputAdornment>
  ),
});

/**
 * Registration form with email, password, and confirm-password fields.
 *
 * @param {Object} props
 * @param {string} [props.error] - Error message supplied by the parent.
 * @param {Function} props.onBack - Called when the user returns to sign in.
 * @param {Function} props.onSubmit - Async handler receiving `{ email, password }`.
 * @returns {JSX.Element} The registration page.
 */
export default function RegisterPage({ error, onBack, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordsMismatch = confirmTouched && password !== confirmPassword;

  /**
   * Validates that both passwords match, then submits the registration.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submit event.
   * @returns {Promise<void>}
   */
  const submit = async (event) => {
    event.preventDefault();
    setFieldError("");
    setConfirmTouched(true);
    if (password !== confirmPassword) {
      return;
    }
    if (!passwordMeetsPolicy(password)) {
      setFieldError("Password does not meet all requirements.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ email: email.trim().toLowerCase(), password });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleShowPassword = () => setShowPassword((current) => !current);
  const toggleShowConfirmPassword = () =>
    setShowConfirmPassword((current) => !current);

  return (
    <AuthFormLayout
      title="Create your account"
      description="Verify your email, then wait for an administrator to approve player access."
      error={fieldError || error}
    >
      <Stack component="form" spacing={2.25} onSubmit={submit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldError("");
          }}
          required
          fullWidth
          slotProps={{
            input: passwordToggleInput(showPassword, toggleShowPassword),
          }}
        />
        <PasswordRequirementsChecklist
          password={password}
          sx={{ mt: "-8px !important" }}
        />
        <TextField
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            if (confirmTouched) setFieldError("");
          }}
          onBlur={() => setConfirmTouched(true)}
          error={passwordsMismatch}
          helperText={passwordsMismatch ? "Passwords do not match." : " "}
          required
          fullWidth
          slotProps={{
            input: passwordToggleInput(
              showConfirmPassword,
              toggleShowConfirmPassword,
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting}
          sx={{ minHeight: 48, fontSize: "0.95rem" }}
        >
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "CREATE ACCOUNT"
          )}
        </Button>
        <Button
          type="button"
          onClick={onBack}
          sx={{ alignSelf: "center", minHeight: "auto", px: 1, py: 0.75 }}
        >
          Back to sign in
        </Button>
      </Stack>
    </AuthFormLayout>
  );
}
