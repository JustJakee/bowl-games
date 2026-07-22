// UI — ENTRIES — REACT
import { useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  Alert,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import Panel from "../components/common/Panel";
import StatusChip from "../components/common/StatusChip";
import { useAppData } from "../app/AppDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import {
  calculatePickSetStatus,
  PICK_SET_STATUS,
} from "../data/picksRepository";

const buildEntryName = (username, index) =>
  username ? `${username}'s Entry ${index}` : `Entry ${index}`;

const buildNextEntryName = (entries, username) => {
  const existingNames = new Set(
    (entries || []).map((entry) =>
      String(entry?.entryName || "").toLowerCase(),
    ),
  );
  let index = entries.length + 1;
  let candidate = buildEntryName(username, index);

  while (existingNames.has(candidate.toLowerCase())) {
    index += 1;
    candidate = buildEntryName(username, index);
  }

  return candidate;
};

const EntriesPage = () => {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { profile } = useUserProfile();
  const {
    createSeasonEntry,
    currentEntry,
    entries,
    entriesError,
    entriesLoading,
    matchups,
    savedSelectionsByGameId,
    setActiveEntryId,
    tieBreakerRequired,
  } = useAppData();
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateEntry = async () => {
    setCreating(true);
    setError("");

    try {
      const createdEntry = await createSeasonEntry({
        entryName: buildNextEntryName(entries, profile?.username),
        userProfileId: profile?.id,
      });

      setActiveEntryId(createdEntry.id);
      setSearchParams({ entry: createdEntry.id });
      navigate(`/picks?entry=${createdEntry.id}`);
    } catch (createError) {
      setError(createError?.message || "Unable to create a new entry.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Stack spacing={2}>
      {entriesError ? <Alert severity="error">{entriesError}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Panel elevated>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
          >
            <div>
              <Typography variant="overline" color="text.secondary">
                Active Season Entries
              </Typography>
              <Typography variant="h4">My Entries</Typography>
            </div>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleCreateEntry}
              disabled={creating}
            >
              {creating ? "Creating..." : "New Entry"}
            </Button>
          </Stack>
          {entriesLoading ? (
            <Typography variant="body1">Loading your entries...</Typography>
          ) : null}
          {!entriesLoading && entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No entries exist yet for the active season. Create one to start
              making picks.
            </Typography>
          ) : null}
          {!entriesLoading && entries.length > 0 ? (
            <List disablePadding>
              {entries.map((entry) => {
                const isCurrent = currentEntry?.id === entry.id;
                const status = isCurrent
                  ? calculatePickSetStatus({
                      requiredGameIds: matchups.map((matchup) => matchup.id),
                      selectionsByGameId: savedSelectionsByGameId,
                      tieBreakerRequired,
                      tieBreakerValue: currentEntry?.tieBreakerValue,
                    })
                  : PICK_SET_STATUS.DRAFT;

                return (
                  <ListItemButton
                    key={entry.id}
                    onClick={() => {
                      setActiveEntryId(entry.id);
                      navigate(`/picks?entry=${entry.id}`);
                    }}
                    sx={{ px: 0, py: 1.25, borderRadius: 2 }}
                  >
                    <ListItemText
                      primary={entry.entryName}
                      secondary={
                        isCurrent
                          ? "Currently selected"
                          : "Open this entry in Picks"
                      }
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StatusChip
                        label={
                          status === PICK_SET_STATUS.COMPLETE
                            ? "Complete"
                            : "Draft"
                        }
                      />
                      <ChevronRightRoundedIcon color="action" />
                    </Stack>
                  </ListItemButton>
                );
              })}
            </List>
          ) : null}
        </Stack>
      </Panel>
    </Stack>
  );
};

export default EntriesPage;
