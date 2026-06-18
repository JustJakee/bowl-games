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

const LoginPage = ({
  defaultEmail = "",
  error = "",
  success = "",
  onForgotPassword,
  onSubmit,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");

    if (!email.trim() || !password) {
      setFieldError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        password,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "SIGN IN"}
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={() => onForgotPassword(email.trim())}
          sx={{ alignSelf: "center", minHeight: "auto", p: 0.5 }}
        >
          Forgot your password?
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 3.5 }}>
        Need access? Contact the administrator.
      </Typography>
    </AuthFormLayout>
  );
};

export default LoginPage;
