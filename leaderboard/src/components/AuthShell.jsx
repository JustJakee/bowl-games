import { useEffect, useMemo, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
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
import { I18n } from "aws-amplify/utils";
import { useAuth } from "../auth/AuthContext";
import { UserProfileProvider, useUserProfile } from "../auth/UserProfileContext.jsx";
import {
  createCurrentUserProfile,
  isUsernameTaken,
  normalizeUsernameKey,
  validateUsername,
} from "../auth/userProfile";
import { themeTokens } from "../theme/theme";

const formatUserLabel = (user) => {
  return user?.signInDetails?.loginId || user?.username || "Signed-in user";
};

const isLoginPath = () => window.location.pathname === "/login";

const AUTH_TRANSLATIONS = {
  "Sign In": "SIGN IN",
  "Sign in": "SIGN IN",
  "Sign in to your account": "Sign in to your player account",
  "Sign in to your player account": "Sign in to your player account",
  "Enter your email and password to sign in": "Enter the email and password associated with your Bob's Bowl Games account.",
  Username: "Email",
  Email: "Email",
  Password: "Password",
  "Enter your Username": "Enter your email",
  "Enter your Email": "Enter your email",
  "Enter your Password": "Enter your password",
  "Forgot your password?": "Forgot your password?",
  "Forgot Password": "Forgot your password?",
  "Reset Password": "Reset your password",
  "Send code": "Send code",
  "Back to Sign In": "Back to sign in",
  "Confirm Reset Password": "Check your email",
  "Confirmation Code": "Confirmation Code",
  "Enter your code": "Enter your confirmation code",
  "Code *": "Confirmation Code",
  "Confirm": "Confirm",
};

const loginSlotSx = {
  "& [data-amplify-authenticator]": {
    backgroundColor: "transparent",
    padding: 0,
  },
  "& [data-amplify-container]": {
    display: "contents",
  },
  "& [data-amplify-router]": {
    backgroundColor: "transparent",
    boxShadow: "none",
    border: "none",
    padding: 0,
  },
  "& [data-amplify-form]": {
    backgroundColor: "transparent",
    padding: 0,
    gap: 14,
  },
  "& [data-amplify-footer]": {
    paddingTop: 6,
  },
  "& .amplify-tabs": {
    display: "none",
  },
  "& .amplify-text": {
    color: themeTokens.primaryText,
  },
  "& .amplify-heading": {
    color: themeTokens.primaryText,
    fontFamily: '"Roboto Condensed", "Arial Narrow", "Arial", sans-serif',
    fontWeight: 800,
    letterSpacing: "0.02em",
  },
  "& .amplify-label": {
    color: themeTokens.secondaryText,
    fontWeight: 600,
  },
  "& .amplify-field-group__control": {
    backgroundColor: themeTokens.appBackground,
    borderColor: themeTokens.divider,
    borderRadius: "4px",
    color: themeTokens.primaryText,
    minHeight: 46,
  },
  "& .amplify-field__show-password": {
    color: themeTokens.secondaryText,
  },
  "& .amplify-input": {
    backgroundColor: themeTokens.appBackground,
    color: themeTokens.primaryText,
    borderColor: themeTokens.divider,
    borderRadius: "4px",
    minHeight: 46,
    boxShadow: "none",
  },
  "& .amplify-input::placeholder": {
    color: alpha(themeTokens.secondaryText, 0.7),
  },
  "& .amplify-input:focus": {
    borderColor: themeTokens.maize,
    boxShadow: `0 0 0 1px ${themeTokens.maize}`,
  },
  "& input:-webkit-autofill": {
    WebkitBoxShadow: `0 0 0 100px ${themeTokens.appBackground} inset`,
    WebkitTextFillColor: themeTokens.primaryText,
    caretColor: themeTokens.primaryText,
    borderRadius: "4px",
  },
  "& .amplify-button--primary": {
    backgroundColor: themeTokens.maize,
    borderColor: themeTokens.maize,
    color: "#08111f",
    borderRadius: "4px",
    minHeight: 44,
    fontFamily: '"Roboto Condensed", "Arial Narrow", "Arial", sans-serif',
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  "& .amplify-button--primary:hover": {
    backgroundColor: "#ffd84a",
    borderColor: "#ffd84a",
  },
  "& .amplify-button--link": {
    color: themeTokens.linkBlue,
    fontWeight: 600,
  },
  "& .amplify-alert": {
    borderRadius: "4px",
  },
  "& .amplify-alert__body, & .amplify-text--error": {
    color: "#ffb4ab",
  },
  "& .amplify-flex": {
    gap: 12,
  },
};

const GateFrame = ({ title, subtitle, children }) => {
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
          maxWidth: 480,
          p: { xs: 2.5, sm: 4 },
          backgroundColor: alpha(themeTokens.panelBackgroundElevated, 0.94),
          border: `1px solid ${themeTokens.divider}`,
          borderRadius: "6px",
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
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          </Box>
          {children}
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
      <GateFrame
        title="Loading your profile"
        subtitle="Checking your account, groups, and saved public username."
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography variant="body2">Loading profile...</Typography>
        </Stack>
      </GateFrame>
    );
  }

  if (status === "error") {
    return (
      <GateFrame
        title="Profile unavailable"
        subtitle="Your account is signed in, but the profile data could not be loaded."
      >
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={signOut}>
          Sign out
        </Button>
      </GateFrame>
    );
  }

  if (status === "needs-setup") {
    return (
      <GateFrame
        title="Choose your public username"
        subtitle="You sign in with email, but the app displays your public username on leaderboards and dashboard surfaces."
      >
        <Stack spacing={2} component="form" onSubmit={handleProfileSubmit}>
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
  const [showLogin, setShowLogin] = useState(isLoginPath);
  const { isAuthenticated, isConfigured, isLoading } = useAuth();

  useEffect(() => {
    I18n.putVocabulariesForLanguage("en", AUTH_TRANSLATIONS);
  }, []);

  if (isLoading) {
    return (
      <GateFrame
        title="Loading authentication"
        subtitle="Checking your session and environment configuration."
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography variant="body2">Loading authentication status...</Typography>
        </Stack>
      </GateFrame>
    );
  }

  if (!isConfigured) {
    return (
      <GateFrame
        title="Authentication not configured"
        subtitle="This environment still needs frontend authentication outputs before the app can sign users in."
      >
        <Alert severity="warning">
          `amplify_outputs.json` must be available for the frontend build.
        </Alert>
      </GateFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <GateFrame
        title="Sign in to your player account"
        subtitle="Enter the email and password associated with your Bob's Bowl Games account."
      >
        {!showLogin ? (
          <Button variant="contained" onClick={() => setShowLogin(true)} sx={{ width: "100%" }}>
            Sign In
          </Button>
        ) : (
          <Stack spacing={2} sx={{ ...loginSlotSx }}>
            <Box>
              <Authenticator
                hideSignUp
                formFields={{
                  signIn: {
                    username: {
                      label: "Email",
                      placeholder: "Enter your email",
                      isRequired: true,
                    },
                    password: {
                      label: "Password",
                      placeholder: "Enter your password",
                      isRequired: true,
                    },
                  },
                  forgotPassword: {
                    username: {
                      label: "Email",
                      placeholder: "Enter your email",
                      isRequired: true,
                    },
                  },
                  confirmResetPassword: {
                    confirmation_code: {
                      label: "Confirmation Code",
                      placeholder: "Enter your confirmation code",
                      isRequired: true,
                    },
                    password: {
                      label: "Password",
                      placeholder: "Enter your new password",
                      isRequired: true,
                    },
                    confirm_password: {
                      label: "Confirm Password",
                      placeholder: "Confirm your new password",
                      isRequired: true,
                    },
                  },
                }}
              >
                {() => null}
              </Authenticator>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              Need access to the pool? Contact the pool administrator.
            </Typography>
          </Stack>
        )}
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
