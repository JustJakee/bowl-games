import { useEffect, useMemo, useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  TextField,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import {
  createCurrentUserProfile,
  getCurrentUserProfile,
  isUsernameTaken,
  normalizeUsernameKey,
  validateUsername,
} from "../auth/userProfile";

const ROLE_MESSAGES = {
  admin: "Admin tools coming soon.",
  player: "Player dashboard coming soon.",
};

const formatUserLabel = (user) => {
  return user?.signInDetails?.loginId || user?.username || "Signed-in user";
};

const isLoginPath = () => window.location.pathname === "/login";

const AccountSummary = ({ email, groups, profile, role, signOut, user }) => {
  return (
    <Paper elevation={0} sx={{ mb: 3, p: 3, border: "1px solid #d7dee7" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Account
          </Typography>
          <Typography variant="h6">{profile.username}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {email || formatUserLabel(user)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: "wrap" }}>
            {groups.length > 0 ? (
              groups.map((group) => (
                <Chip key={group} label={group} size="small" color="primary" />
              ))
            ) : (
              <Chip label="no role assigned" size="small" variant="outlined" />
            )}
          </Stack>
          <Typography variant="body2">
            {role
              ? ROLE_MESSAGES[role]
              : "Your account is signed in but does not have an assigned role yet."}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={signOut}>
          Sign out
        </Button>
      </Stack>
    </Paper>
  );
};

const AuthShell = () => {
  const [showLogin, setShowLogin] = useState(isLoginPath);
  const [profileState, setProfileState] = useState({
    error: "",
    profile: null,
    status: "idle",
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    email,
    groups,
    isAuthenticated,
    isConfigured,
    isLoading,
    role,
    signOut,
    user,
  } = useAuth();

  const owner = user?.userId || null;
  const derivedRole = role || null;
  const privateEmail = email || formatUserLabel(user);

  useEffect(() => {
    if (!isAuthenticated || !isConfigured || !owner) {
      setProfileState({
        error: "",
        profile: null,
        status: "idle",
      });
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setProfileState((current) => ({
        error: "",
        profile: current.profile,
        status: "loading",
      }));

      try {
        const profile = await getCurrentUserProfile(owner);
        if (!isMounted) {
          return;
        }

        setProfileState({
          error: "",
          profile,
          status: profile ? "ready" : "needs-setup",
        });
      } catch (profileError) {
        if (!isMounted) {
          return;
        }

        setProfileState({
          error:
            profileError?.message ||
            "Unable to load your profile right now. Please try again.",
          profile: null,
          status: "error",
        });
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isConfigured, owner]);

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

      const profile = await createCurrentUserProfile({
        email: privateEmail,
        preferredGroup: derivedRole,
        username: usernameInput,
      });

      setProfileState({
        error: "",
        profile,
        status: "ready",
      });
      setUsernameInput("");
    } catch (profileError) {
      setSubmitError(
        profileError?.message ||
          "Unable to save your username right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ mb: 3, p: 3, border: "1px solid #d7dee7" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">
            Loading authentication status...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (!isConfigured) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        Authentication is not configured for this environment yet.
        {" "}`amplify_outputs.json` must be available for the frontend build.
        Public signup remains disabled for this milestone and will be handled
        later.
      </Alert>
    );
  }

  if (isAuthenticated) {
    if (profileState.status === "loading" || profileState.status === "idle") {
      return (
        <Paper elevation={0} sx={{ mb: 3, p: 3, border: "1px solid #d7dee7" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography variant="body2">Loading your profile...</Typography>
          </Stack>
        </Paper>
      );
    }

    if (profileState.status === "error") {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          {profileState.error}
        </Alert>
      );
    }

    if (profileState.status === "needs-setup") {
      return (
        <Paper elevation={0} sx={{ mb: 3, p: 3, border: "1px solid #d7dee7" }}>
          <Stack spacing={2} component="form" onSubmit={handleProfileSubmit}>
            <Box>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                Profile Setup
              </Typography>
              <Typography variant="h6">Choose your public username</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                You sign in with email, but public leaderboards will show your
                username instead. Emails remain private.
              </Typography>
            </Box>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Public signup is still disabled. Username uniqueness is checked
                before profile creation.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" onClick={signOut} disabled={isSubmitting}>
                  Sign out
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save username"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      );
    }

    return (
      <AccountSummary
        email={privateEmail}
        groups={groups}
        profile={profileState.profile}
        role={role}
        signOut={signOut}
        user={user}
      />
    );
  }

  return (
    <Paper elevation={0} sx={{ mb: 3, p: 3, border: "1px solid #d7dee7" }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Account Access
          </Typography>
          <Typography variant="h6">Sign in with your Cognito account</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Accounts are currently created manually. Public signup is
            intentionally disabled for this milestone and will be added later.
          </Typography>
        </Box>

        {!showLogin ? (
          <Button variant="contained" onClick={() => setShowLogin(true)}>
            Sign in
          </Button>
        ) : (
          <Box sx={{ maxWidth: 420 }}>
            {/* TODO: add public self-service signup in a later milestone. */}
            <Authenticator hideSignUp>
              {() => null}
            </Authenticator>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default AuthShell;
