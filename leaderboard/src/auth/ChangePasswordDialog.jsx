import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { updatePassword } from "aws-amplify/auth";
import PasswordRequirementsChecklist from "./PasswordRequirementsChecklist.jsx";
import { passwordMeetsPolicy } from "./passwordPolicy.js";

const SUCCESS_MESSAGE = "Your password has been updated successfully.";

export const validateChangePassword = ({
  currentPassword = "",
  newPassword = "",
  confirmPassword = "",
}) => {
  const errors = {
    currentRequired: !currentPassword,
    newRequired: !newPassword,
    newPolicy: Boolean(newPassword) && !passwordMeetsPolicy(newPassword),
    sameAsCurrent:
      Boolean(currentPassword) &&
      Boolean(newPassword) &&
      currentPassword === newPassword,
    confirmRequired: !confirmPassword,
    mismatch:
      Boolean(confirmPassword) && newPassword !== confirmPassword,
  };

  return {
    ...errors,
    valid: !Object.values(errors).some(Boolean),
  };
};

export const getChangePasswordErrorMessage = (error) => {
  const name = error?.name || "";
  const message = String(error?.message || "").toLowerCase();

  if (
    name === "UserUnAuthenticatedException" ||
    name === "AuthTokenConfigException" ||
    message.includes("access token") ||
    message.includes("not authenticated") ||
    message.includes("session") ||
    message.includes("expired") ||
    message.includes("revoked")
  ) {
    return "Your session has expired. Sign in again before changing your password.";
  }

  if (
    name === "NotAuthorizedException" ||
    message.includes("incorrect username or password")
  ) {
    return "Your current password is incorrect.";
  }

  if (
    name === "InvalidPasswordException" ||
    (name === "InvalidParameterException" && message.includes("password"))
  ) {
    return "Your new password does not meet the account requirements.";
  }

  if (
    name === "LimitExceededException" ||
    name === "TooManyRequestsException" ||
    message.includes("rate exceeded") ||
    message.includes("attempt limit exceeded")
  ) {
    return "Too many attempts. Wait a moment and try again.";
  }

  if (
    name === "NetworkError" ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "A network error prevented the password update. Check your connection and try again.";
  }

  return "Your password could not be updated. Please try again.";
};

export const submitChangePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
  updatePasswordAction = updatePassword,
}) => {
  const validation = validateChangePassword({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (!validation.valid) return { ok: false, validation };

  try {
    await updatePasswordAction({
      oldPassword: currentPassword,
      newPassword,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getChangePasswordErrorMessage(error),
    };
  }
};

const passwordToggleInput = (visible, onToggle, fieldName) => ({
  endAdornment: (
    <InputAdornment position="end">
      <IconButton
        aria-label={`${visible ? "Hide" : "Show"} ${fieldName}`}
        onClick={onToggle}
        edge="end"
      >
        {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
      </IconButton>
    </InputAdornment>
  ),
});

const ChangePasswordDialog = ({
  open,
  onClose,
  onSuccess,
  updatePasswordAction = updatePassword,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTouched, setCurrentTouched] = useState(false);
  const [newTouched, setNewTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const submissionInFlightRef = useRef(false);
  const validation = validateChangePassword({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setCurrentTouched(false);
    setNewTouched(false);
    setConfirmTouched(false);
    setRequestError("");
  };

  useEffect(() => {
    if (!open && !submissionInFlightRef.current) resetForm();
  }, [open]);

  const handleClose = () => {
    if (submissionInFlightRef.current) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submissionInFlightRef.current) return;

    setCurrentTouched(true);
    setNewTouched(true);
    setConfirmTouched(true);
    setRequestError("");
    if (!validation.valid) return;

    submissionInFlightRef.current = true;
    setSubmitting(true);
    const result = await submitChangePassword({
      currentPassword,
      newPassword,
      confirmPassword,
      updatePasswordAction,
    });

    if (result.ok) {
      resetForm();
      onClose();
      onSuccess(SUCCESS_MESSAGE);
    } else if (result.errorMessage) {
      setRequestError(result.errorMessage);
    }

    submissionInFlightRef.current = false;
    setSubmitting(false);
  };

  const clearRequestError = () => setRequestError("");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="change-password-dialog-title"
      aria-describedby="change-password-dialog-description"
      slotProps={{
        paper: {
          sx: {
            width: "100%",
            maxWidth: { sm: 500 },
            m: { xs: 0, sm: 2 },
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "contents" }}
      >
        <DialogTitle id="change-password-dialog-title">
          Change Password
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <DialogContentText id="change-password-dialog-description">
              Enter your current password, then choose a new password for your
              account.
            </DialogContentText>
            {requestError ? (
              <Alert severity="error">{requestError}</Alert>
            ) : null}
            <TextField
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                clearRequestError();
              }}
              onBlur={() => setCurrentTouched(true)}
              error={currentTouched && validation.currentRequired}
              helperText={
                currentTouched && validation.currentRequired
                  ? "Enter your current password."
                  : " "
              }
              required
              fullWidth
              autoFocus
              slotProps={{
                input: passwordToggleInput(
                  showCurrentPassword,
                  () => setShowCurrentPassword((current) => !current),
                  "current password",
                ),
              }}
            />
            <TextField
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                clearRequestError();
              }}
              onBlur={() => setNewTouched(true)}
              error={
                (newTouched && validation.newRequired) ||
                validation.sameAsCurrent
              }
              helperText={
                newTouched && validation.newRequired
                  ? "Enter a new password."
                  : validation.sameAsCurrent
                    ? "Your new password must be different from your current password."
                    : " "
              }
              required
              fullWidth
              slotProps={{
                input: passwordToggleInput(
                  showNewPassword,
                  () => setShowNewPassword((current) => !current),
                  "new password",
                ),
              }}
            />
            <PasswordRequirementsChecklist password={newPassword} />
            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearRequestError();
              }}
              onBlur={() => setConfirmTouched(true)}
              error={
                confirmTouched &&
                (validation.confirmRequired || validation.mismatch)
              }
              helperText={
                confirmTouched && validation.confirmRequired
                  ? "Confirm your new password."
                  : confirmTouched && validation.mismatch
                    ? "Passwords do not match."
                    : " "
              }
              required
              fullWidth
              slotProps={{
                input: passwordToggleInput(
                  showConfirmPassword,
                  () => setShowConfirmPassword((current) => !current),
                  "new password confirmation",
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& > :not(style)": { m: 0 },
          }}
        >
          <Button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            fullWidth={fullScreen}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!validation.valid || submitting}
            fullWidth={fullScreen}
            sx={{ minHeight: 44 }}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Update Password"
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ChangePasswordDialog;
