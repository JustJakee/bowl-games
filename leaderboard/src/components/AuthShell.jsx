import { useState } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/AuthContext";

const ROLE_MESSAGES = {
  admin: "Admin tools coming soon.",
  player: "Player dashboard coming soon.",
};

const formatUserLabel = (user) => {
  return user?.signInDetails?.loginId || user?.username || "Signed-in user";
};

const AuthShell = () => {
  const [showLogin, setShowLogin] = useState(false);
  const {
    error,
    groups,
    isAuthenticated,
    isConfigured,
    isLoading,
    role,
    signOut,
    user,
  } = useAuth();

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
            <Typography variant="h6">{formatUserLabel(user)}</Typography>
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
