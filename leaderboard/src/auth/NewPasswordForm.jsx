import { useState } from "react";
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import AuthFormLayout from "./AuthFormLayout";

const NewPasswordForm = ({ error = "", onSubmit }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");

    if (!newPassword || !confirmPassword) {
      setFieldError("Enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(newPassword);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Set your new password"
      description="You need to update your password before you can access Bob's Bowl Games."
      error={fieldError || error}
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <TextField
          label="New Password"
          type={showNewPassword ? "text" : "password"}
          autoComplete="new-password"
          fullWidth
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowNewPassword((current) => !current)}
                  edge="end"
                >
                  {showNewPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          fullWidth
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "SAVE NEW PASSWORD"}
        </Button>
      </Stack>
    </AuthFormLayout>
  );
};

export default NewPasswordForm;
