import { useState } from "react";
import { Button, CircularProgress, Stack, TextField } from "@mui/material";
import AuthFormLayout from "./AuthFormLayout";

export default function RegisterPage({ error, onBack, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setFieldError("");
    if (password !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ email: email.trim().toLowerCase(), password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Create your account"
      description="Verify your email, then wait for an administrator to approve player access."
      error={fieldError || error}
    >
      <Stack component="form" spacing={2} onSubmit={submit}>
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
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "CREATE ACCOUNT"
          )}
        </Button>
        <Button type="button" onClick={onBack}>
          Back to sign in
        </Button>
      </Stack>
    </AuthFormLayout>
  );
}
