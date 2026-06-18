import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import { alpha } from "@mui/material/styles";
import {
  confirmResetPassword,
  confirmSignIn,
  resetPassword,
  signIn,
} from "aws-amplify/auth";
import { useAuth } from "../auth/AuthContext";
import { UserProfileProvider, useUserProfile } from "../auth/UserProfileContext.jsx";
import {
  createCurrentUserProfile,
  isUsernameTaken,
  normalizeUsernameKey,
  validateUsername,
} from "../auth/userProfile";
import { themeTokens } from "../theme/theme";
import LoginPage from "../auth/LoginPage.jsx";
import ResetPasswordForm from "../auth/ResetPasswordForm.jsx";
import ConfirmResetPasswordForm from "../auth/ConfirmResetPasswordForm.jsx";
import NewPasswordForm from "../auth/NewPasswordForm.jsx";
import { mapAuthErrorMessage } from "../auth/authErrorMessages.js";

const formatUserLabel = (user) => {
  return user?.signInDetails?.loginId || user?.username || "Signed-in user";
};

const authPanelInputSx = {
  "& .MuiInputBase-root": {
    backgroundColor: themeTokens.appBackground,
    borderRadius: "4px",
    minHeight: 46,
  },
  "& .MuiInputLabel-root": {
    color: themeTokens.secondaryText,
  },
  "& .MuiInputBase-input": {
    color: themeTokens.primaryText,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: themeTokens.divider,
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: alpha(themeTokens.primaryText, 0.4),
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: themeTokens.maize,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: themeTokens.maize,
  },
  "& .MuiFormHelperText-root": {
    color: themeTokens.secondaryText,
  },
  "& input:-webkit-autofill": {
    WebkitBoxShadow: `0 0 0 100px ${themeTokens.appBackground} inset`,
    WebkitTextFillColor: themeTokens.primaryText,
    caretColor: themeTokens.primaryText,
    borderRadius: "4px",
  },
};

const GateFrame = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 3 },
        py: 6,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 4 },
          backgroundColor: alpha(themeTokens.panelBackgroundElevated, 0.94),
          border: `1px solid ${themeTokens.divider}`,
          borderRadius: "3px",
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StarsRoundedIcon sx={{ color: "primary.main" }} />
            <Typography
              variant="h5"
              sx={{
                textTransform: "uppercase",
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              Bob's Bowl Games
            </Typography>
          </Stack>
          <Box sx={authPanelInputSx}>{children}</Box>
        </Stack>
      </Paper>
    </Box>
  );
};

const ProfileGate = ({ children }) => {
  const [usernameInput, setUsernameInput] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { email, groups, role, signOut, user } = useAuth();
  const { status, error, profile } = useUserProfile();

  const privateEmail = email || formatUserLabel(user);
  const usernamePreview = useMemo(
    () => normalizeUsernameKey(usernameInput || ""),
    [usernameInput]
  );

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const validationMessage = validateUsername(usernameInput);
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    if (!privateEmail) {
      setSubmitError("Your signed-in email was not available from the session.");
      return;
    }

    setIsSubmitting(true);

    try {
      const usernameKey = normalizeUsernameKey(usernameInput);
      const taken = await isUsernameTaken(usernameKey);

      if (taken) {
        setSubmitError("That username is already taken. Please choose another.");
        return;
      }

      await createCurrentUserProfile({
        email: privateEmail,
        preferredGroup: role || undefined,
        username: usernameInput,
      });

      window.location.reload();
    } catch (profileError) {
      setSubmitError(
        profileError?.message ||
          "Unable to save your username right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || status === "refreshing" || status === "idle") {
    return (
      <GateFrame>
        <Typography variant="h6">Loading your profile</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Checking your account, groups, and saved public username.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">Loading profile...</Typography>
        </Stack>
      </GateFrame>
    );
  }

  if (status === "error") {
    return (
      <GateFrame>
        <Typography variant="h6">Profile unavailable</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your account is signed in, but the profile data could not be loaded.
        </Typography>
        <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>
        <Button variant="outlined" onClick={signOut} sx={{ mt: 3 }}>
          Sign out
        </Button>
      </GateFrame>
    );
  }

  if (status === "needs-setup") {
    return (
      <GateFrame>
        <Typography variant="h6">Choose your public username</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You sign in with email, but the app displays your public username on leaderboards and dashboard surfaces.
        </Typography>
        <Stack spacing={2} component="form" onSubmit={handleProfileSubmit} sx={{ mt: 3 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {groups.length > 0 ? (
              groups.map((group) => <Chip key={group} label={group} size="small" color="primary" />)
            ) : (
              <Chip label="no role assigned" size="small" variant="outlined" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Signed in as {privateEmail}
          </Typography>
          <TextField
            label="Username"
            value={usernameInput}
            onChange={(event) => {
              setUsernameInput(event.target.value);
              setSubmitError("");
            }}
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off",
              maxLength: 20,
            }}
            helperText={
              usernameInput
                ? `Username key: ${usernamePreview}`
                : "3-20 characters. Letters, numbers, underscores, and hyphens only."
            }
            autoComplete="off"
            required
          />
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          <Divider />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button variant="outlined" onClick={signOut} disabled={isSubmitting}>
              Sign out
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save username"}
            </Button>
          </Stack>
        </Stack>
      </GateFrame>
    );
  }

  return children(profile);
};

const AuthShell = ({ children }) => {
  const { isAuthenticated, isConfigured, isLoading } = useAuth();
  const [authView, setAuthView] = useState("signIn");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState("");

  const resetMessages = () => {
    setError("");
    setInfo("");
    setSuccess("");
  };

  const handleSignInNextStep = async (result, currentEmail) => {
    const step = result?.nextStep?.signInStep;

    if (step === "DONE" || result?.isSignedIn) {
      return;
    }

    if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
      setEmail(currentEmail);
      setAuthView("newPassword");
      return;
    }

    if (step === "RESET_PASSWORD") {
      try {
        const output = await resetPassword({ username: currentEmail });
        const resetStep = output?.nextStep?.resetPasswordStep;
        setEmail(currentEmail);

        if (resetStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
          setInfo("We sent a confirmation code to the recovery method associated with your account.");
          setAuthView("confirmReset");
          return;
        }
      } catch (resetError) {
        setError(
          mapAuthErrorMessage(
            resetError,
            "A confirmation code could not be sent. Contact the pool administrator."
          )
        );
        setAuthView("signIn");
        return;
      }
    }

    if (import.meta.env.DEV && step) {
      console.warn("Unhandled sign-in step:", step);
    }

    setError("Additional account verification is required. Contact the pool administrator.");
  };

  const handleSignIn = async ({ email: submittedEmail, password }) => {
    resetMessages();
    setEmail(submittedEmail);

    try {
      const result = await signIn({
        username: submittedEmail.trim(),
        password,
      });

      await handleSignInNextStep(result, submittedEmail.trim());
    } catch (signInError) {
      setError(mapAuthErrorMessage(signInError, "Unable to sign in right now. Please try again."));
      throw signInError;
    }
  };

  const handleRequestResetPassword = async (submittedEmail) => {
    resetMessages();
    setEmail(submittedEmail);

    try {
      const output = await resetPassword({
        username: submittedEmail.trim(),
      });

      const resetStep = output?.nextStep?.resetPasswordStep;

      if (resetStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        setInfo("We sent a confirmation code to the recovery method associated with your account.");
        setAuthView("confirmReset");
        return;
      }

      setError("A confirmation code could not be sent. Contact the pool administrator.");
    } catch (resetError) {
      setError(
        mapAuthErrorMessage(
          resetError,
          "A confirmation code could not be sent. Contact the pool administrator."
        )
      );
      throw resetError;
    }
  };

  const handleConfirmResetPassword = async ({ confirmationCode, newPassword }) => {
    resetMessages();

    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode,
        newPassword,
      });

      setAuthView("signIn");
      setSuccess("Your password has been updated. Sign in with your new password.");
    } catch (confirmError) {
      setError(
        mapAuthErrorMessage(
          confirmError,
          "The confirmation code is invalid or expired."
        )
      );
      throw confirmError;
    }
  };

  const handleConfirmNewPassword = async (newPassword) => {
    resetMessages();

    try {
      const result = await confirmSignIn({
        challengeResponse: newPassword,
      });

      await handleSignInNextStep(result, email.trim());
    } catch (confirmError) {
      setError(
        mapAuthErrorMessage(
          confirmError,
          "Your new password does not meet the account requirements."
        )
      );
      throw confirmError;
    }
  };

  if (isLoading) {
    return (
      <GateFrame>
        <Typography variant="h6">Loading authentication</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Checking your session and environment configuration.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">Loading authentication status...</Typography>
        </Stack>
      </GateFrame>
    );
  }

  if (!isConfigured) {
    return (
      <GateFrame>
        <Typography variant="h6">Authentication not configured</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This environment still needs frontend authentication outputs before the app can sign users in.
        </Typography>
        <Alert severity="warning" sx={{ mt: 3 }}>
          `amplify_outputs.json` must be available for the frontend build.
        </Alert>
      </GateFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <GateFrame>
        {authView === "signIn" ? (
          <LoginPage
            defaultEmail={email}
            error={error}
            success={success}
            onForgotPassword={(prefilledEmail) => {
              resetMessages();
              setEmail(prefilledEmail || email);
              setAuthView("forgotPassword");
            }}
            onSubmit={handleSignIn}
          />
        ) : null}

        {authView === "forgotPassword" ? (
          <ResetPasswordForm
            defaultEmail={email}
            error={error}
            onBack={() => {
              resetMessages();
              setAuthView("signIn");
            }}
            onSubmit={handleRequestResetPassword}
          />
        ) : null}

        {authView === "confirmReset" ? (
          <ConfirmResetPasswordForm
            email={email}
            error={error}
            info={info}
            onBack={() => {
              resetMessages();
              setAuthView("signIn");
            }}
            onSubmit={handleConfirmResetPassword}
          />
        ) : null}

        {authView === "newPassword" ? (
          <NewPasswordForm
            error={error}
            onSubmit={handleConfirmNewPassword}
          />
        ) : null}
      </GateFrame>
    );
  }

  return (
    <UserProfileProvider>
      <ProfileGate>{() => children}</ProfileGate>
    </UserProfileProvider>
  );
};

export default AuthShell;
