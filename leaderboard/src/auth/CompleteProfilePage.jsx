import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { alpha } from "@mui/material/styles";
import FavoriteTeamDialog from "../components/account/FavoriteTeamDialog.jsx";
import TeamAvatar from "../components/account/TeamAvatar.jsx";
import useFbsTeams from "../hooks/useFbsTeams.js";
import { themeTokens } from "../theme/theme.js";
import UsernameRequirementsChecklist from "./UsernameRequirementsChecklist.jsx";
import { validateUsername } from "./userProfile.js";

export const FavoriteTeamSetupSection = ({ onChoose, team }) => (
  <Box
    component="section"
    aria-labelledby="favorite-team-setup-title"
    sx={{
      p: 1.5,
      border: `1px solid ${themeTokens.divider}`,
      borderRadius: "4px",
      backgroundColor: alpha(themeTokens.appBackground, 0.4),
    }}
  >
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={0.75} alignItems="baseline">
        <Typography
          id="favorite-team-setup-title"
          variant="subtitle2"
          sx={{ fontWeight: 800 }}
        >
          Favorite Team
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Optional
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Choose a team to use its logo as your profile icon.
      </Typography>
      {team ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0, flex: 1 }}
          >
            <TeamAvatar team={team} size={32} />
            <Typography
              variant="body2"
              sx={{ minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}
            >
              {team.displayName}
            </Typography>
          </Stack>
          <Button
            type="button"
            variant="outlined"
            onClick={onChoose}
            sx={{ minHeight: 40, flex: "0 0 auto" }}
          >
            Change Team
          </Button>
        </Stack>
      ) : (
        <Button
          type="button"
          variant="outlined"
          onClick={onChoose}
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, minHeight: 40 }}
        >
          Choose Favorite Team
        </Button>
      )}
    </Stack>
  </Box>
);

const CompleteProfilePage = ({ email, error, onSaveProfile, onSignOut }) => {
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState("");
  const [favoriteTeamOpen, setFavoriteTeamOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    retry: retryTeams,
  } = useFbsTeams();

  const usernameError = validateUsername(username);
  const favoriteTeam =
    teams.find((team) => team.id === String(favoriteTeamId || "")) || null;

  const submit = async (event) => {
    event.preventDefault();
    setUsernameTouched(true);
    setSubmitError("");
    if (usernameError || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    try {
      await onSaveProfile({
        username,
        favoriteTeamId: favoriteTeamId || undefined,
      });
    } catch (saveError) {
      setSubmitError(
        saveError?.message ||
          "Unable to save your profile right now. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Typography variant="h6">Complete Your Player Profile</Typography>
      <Stack component="form" spacing={2} onSubmit={submit} sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Signed in as {email}
        </Typography>
        <Box
          role="note"
          sx={{
            display: "flex",
            gap: 1.25,
            p: 1.5,
            border: `1px solid ${alpha(themeTokens.maize, 0.45)}`,
            borderRadius: "4px",
            backgroundColor: alpha(themeTokens.maize, 0.08),
          }}
        >
          <InfoOutlinedIcon
            aria-hidden="true"
            sx={{ color: themeTokens.maize, fontSize: 20, mt: 0.1 }}
          />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Your username is permanent
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Choose carefully. You won't be able to change it after saving.
            </Typography>
          </Box>
        </Box>
        <Stack spacing={0.75}>
          <TextField
            label="Public Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setSubmitError("");
            }}
            onBlur={() => setUsernameTouched(true)}
            error={usernameTouched && Boolean(usernameError)}
            helperText={
              usernameTouched && usernameError ? usernameError : undefined
            }
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off",
              maxLength: 20,
            }}
            autoComplete="off"
            required
            fullWidth
          />
          <UsernameRequirementsChecklist username={username} />
        </Stack>
        <FavoriteTeamSetupSection
          team={favoriteTeam}
          onChoose={() => setFavoriteTeamOpen(true)}
        />
        {submitError || error ? (
          <Alert severity="error">{submitError || error}</Alert>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            type="button"
            variant="outlined"
            onClick={onSignOut}
            disabled={saving}
            sx={{ minHeight: 44 }}
          >
            Sign out
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={Boolean(usernameError) || saving}
            sx={{ minHeight: 44, flex: 1 }}
          >
            {saving ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Save Profile"
            )}
          </Button>
        </Stack>
      </Stack>
      <FavoriteTeamDialog
        open={favoriteTeamOpen}
        onClose={() => setFavoriteTeamOpen(false)}
        teams={teams}
        loading={teamsLoading}
        error={teamsError}
        onRetry={retryTeams}
        savedTeamId={favoriteTeamId}
        onSave={async (teamId) => setFavoriteTeamId(String(teamId))}
      />
    </>
  );
};

export default CompleteProfilePage;
