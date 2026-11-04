import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TeamAvatar from "./TeamAvatar.jsx";

export const filterFavoriteTeams = (teams, query) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return teams;

  return teams.filter((team) =>
    [
      team.displayName,
      team.abbreviation,
      team.shortDisplayName,
      team.location,
      team.name,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalizedQuery),
    ),
  );
};

const FavoriteTeamDialog = ({
  error,
  loading,
  onClose,
  onRetry,
  onSave,
  open,
  savedTeamId,
  teams,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setSelectedTeam(
      teams.find((team) => team.id === String(savedTeamId || "")) || null,
    );
    setSaveError("");
  }, [open, savedTeamId, teams]);

  const close = () => {
    if (savingRef.current) return;
    setSaveError("");
    onClose();
  };

  const save = async () => {
    if (!selectedTeam || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(selectedTeam.id);
      onClose();
    } catch {
      setSaveError("Your favorite team could not be saved. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="favorite-team-dialog-title"
      aria-describedby="favorite-team-dialog-description"
      slotProps={{
        paper: {
          sx: {
            width: "100%",
            maxWidth: { sm: 560 },
            m: { xs: 0, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle id="favorite-team-dialog-title">
        Choose Favorite Team
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <DialogContentText id="favorite-team-dialog-description">
            Search the FBS team list and select one team to represent your
            account.
          </DialogContentText>

          {error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={onRetry}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}
          {saveError ? <Alert severity="error">{saveError}</Alert> : null}
          {loading ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              role="status"
              aria-live="polite"
            >
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading FBS teams...
              </Typography>
            </Stack>
          ) : null}

          <Autocomplete
            options={teams}
            value={selectedTeam}
            onChange={(_event, value) => {
              setSelectedTeam(value);
              setSaveError("");
            }}
            loading={loading}
            disabled={loading || Boolean(error && !teams.length)}
            filterOptions={(options, state) =>
              filterFavoriteTeams(options, state.inputValue)
            }
            getOptionLabel={(option) => option.displayName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="No FBS teams match your search."
            loadingText="Loading FBS teams..."
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box
                  component="li"
                  key={key}
                  {...optionProps}
                  sx={{ gap: 1.5, minHeight: 54 }}
                >
                  <TeamAvatar team={option} size={34} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {option.displayName}
                    </Typography>
                    {option.abbreviation ? (
                      <Typography variant="caption" color="text.secondary">
                        {option.abbreviation}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search FBS teams"
                placeholder="Team name or abbreviation"
                autoFocus
              />
            )}
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
          onClick={close}
          disabled={saving}
          fullWidth={fullScreen}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="contained"
          onClick={save}
          disabled={
            !selectedTeam ||
            selectedTeam.id === String(savedTeamId || "") ||
            saving
          }
          fullWidth={fullScreen}
          sx={{ minHeight: 44 }}
        >
          {saving ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Save Team"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FavoriteTeamDialog;
