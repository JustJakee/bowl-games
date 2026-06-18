import { useState } from "react";
import { Button, CircularProgress, Stack, TextField } from "@mui/material";
import AuthFormLayout from "./AuthFormLayout";

const ResetPasswordForm = ({
  defaultEmail = "",
  error = "",
  onBack,
  onSubmit,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");

    if (!email.trim()) {
      setFieldError("Enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Reset your password"
      description="Enter the email associated with your Bob's Bowl Games account and weâ€™ll send a confirmation code."
      error={fieldError || error}
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
        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "SEND CODE"}
        </Button>
        <Button type="button" variant="text" onClick={onBack} sx={{ alignSelf: "center", minHeight: "auto", p: 0.5 }}>
          Back to sign in
        </Button>
      </Stack>
    </AuthFormLayout>
  );
};

export default ResetPasswordForm;
