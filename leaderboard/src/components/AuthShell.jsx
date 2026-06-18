import { useMemo, useState } from "react";
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

const GateFrame = ({ title, subtitle, children }) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          p: { xs: 3, sm: 4 },
          backgroundColor: alpha(themeTokens.panelBackgroundElevated, 0.9),
          backdropFilter: "blur(10px)",
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StarsRoundedIcon sx={{ color: "primary.main" }} />
            <Typography variant="h5" sx={{ textTransform: "uppercase" }}>
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

  if (isLoading) {
    return (
      <GateFrame
        title="Loading authentication"
        subtitle="Checking your Cognito session and environment configuration."
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
        subtitle="This environment still needs Amplify frontend outputs before the app can sign users in."
      >
        <Alert severity="warning">
          `amplify_outputs.json` must be available for the frontend build. Public
          signup remains disabled.
        </Alert>
      </GateFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <GateFrame
        title="Sign in with your Cognito account"
        subtitle="Accounts are currently created manually. Public signup is intentionally disabled for this milestone."
      >
        {!showLogin ? (
          <Button variant="contained" onClick={() => setShowLogin(true)}>
            Sign in
          </Button>
        ) : (
          <Box sx={{ maxWidth: 420 }}>
            <Authenticator hideSignUp>{() => null}</Authenticator>
          </Box>
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
