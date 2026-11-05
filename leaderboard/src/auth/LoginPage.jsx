import { useState } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import AuthFormLayout from "./AuthFormLayout";

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
 * Sign-in form with email and password fields, a password visibility
 * toggle, and links to the forgot-password and registration flows.
 *
 * @param {Object} props
 * @param {string} [props.defaultEmail] - Initial value for the email field.
 * @param {string} [props.error] - Error message supplied by the parent.
 * @param {string} [props.success] - Success message supplied by the parent.
 * @param {Function} props.onForgotPassword - Called with the trimmed email when the user requests a reset.
 * @param {Function} props.onRegister - Called when the user chooses to create an account.
 * @param {Function} props.onSubmit - Async handler receiving `{ email, password }`.
 * @returns {JSX.Element} The sign-in page.
 */
const LoginPage = ({
  defaultEmail = "",
  error = "",
  success = "",
  onForgotPassword,
  onRegister,
  onSubmit,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  /**
   * Validates that both fields are filled in, then submits the credentials.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submit event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");

    if (!email.trim() || !password) {
      setFieldError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ email: email.trim(), password });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => setShowPassword((current) => !current);

  return (
    <AuthFormLayout
      title="Sign in to your player account"
      description="Enter the email and password associated with your Bob's Bowl Games account."
      error={fieldError || error}
      success={success}
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          fullWidth
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          fullWidth
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          slotProps={{
            input: passwordToggleInput(showPassword, toggleShowPassword),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "SIGN IN"
          )}
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={() => onForgotPassword(email.trim())}
          sx={{ alignSelf: "center", minHeight: "auto", p: 0.5 }}
        >
          Forgot your password?
        </Button>
        <Button type="button" variant="text" onClick={onRegister}>
          Create an account
        </Button>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mt: 3.5 }}
      >
        New accounts can register here and await administrator approval after
        email verification.
      </Typography>
    </AuthFormLayout>
  );
};

export default LoginPage;
