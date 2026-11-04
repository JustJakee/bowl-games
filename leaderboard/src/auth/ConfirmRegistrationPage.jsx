import { useState } from "react";
import {
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AuthFormLayout from "./AuthFormLayout";

export default function ConfirmRegistrationPage({
  email,
  error,
  info,
  onBack,
  onResend,
  onSubmit,
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(code.trim());
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthFormLayout
      title="Verify your email"
      description={`Enter the confirmation code sent to ${email}.`}
      error={error}
    >
      <Stack component="form" spacing={2} onSubmit={submit}>
        {info ? (
          <Typography variant="body2" color="text.secondary">
            {info}
          </Typography>
        ) : null}
        <TextField
          label="Confirmation code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          required
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "VERIFY EMAIL"
          )}
        </Button>
        <Button type="button" onClick={onResend} disabled={submitting}>
          Resend code
        </Button>
        <Button type="button" onClick={onBack}>
          Back to sign in
        </Button>
      </Stack>
    </AuthFormLayout>
  );
}
