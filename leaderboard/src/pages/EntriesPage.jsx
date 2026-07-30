// UI - PICK SET - REACT
// The legacy /entries URL remains valid, but player management is singular.
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAppData } from "../app/AppDataContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import Panel from "../components/common/Panel";
import StatusChip from "../components/common/StatusChip";
import { PICK_SET_STATUS } from "../data/picksRepository";

const EntriesPage = () => {
  const { profile } = useUserProfile();
  const {
    currentEntry,
    currentEntryStatus,
    entriesError,
    entriesLoading,
    isAdmin,
    matchups,
    picksLoading,
    savedSelectionsByGameId,
  } = useAppData();
  const completedPicks = Object.keys(savedSelectionsByGameId || {}).filter(
    (gameId) => Boolean(savedSelectionsByGameId[gameId]),
  ).length;
  const totalPicks = matchups.length;
  const progress =
    totalPicks > 0 ? Math.round((completedPicks / totalPicks) * 100) : 0;
  const actionLabel =
    currentEntryStatus === PICK_SET_STATUS.COMPLETE
      ? "Review Your Picks"
      : "Continue Your Picks";

  if (entriesLoading || (currentEntry && picksLoading)) {
    return (
      <Panel elevated>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading your pick set...</Typography>
        </Stack>
      </Panel>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}>
        My Pick Set
      </Typography>
      {entriesError ? <Alert severity="error">{entriesError}</Alert> : null}

      {!currentEntry ? (
        <Panel elevated>
          <Stack spacing={1.5}>
            <Typography variant="h5">No pick set yet</Typography>
            <Typography color="text.secondary">
              {isAdmin
                ? "Admin accounts cannot create player pick sets."
                : "Create your pick set to start choosing bowl winners."}
            </Typography>
            {!isAdmin ? (
              <Button component={RouterLink} to="/picks" variant="contained">
                Create Your Pick Set
              </Button>
            ) : null}
          </Stack>
        </Panel>
      ) : (
        <Panel elevated>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <div>
                <Typography variant="h5">{currentEntry.entryName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile?.username || "Player"}
                </Typography>
              </div>
              <StatusChip
                label={
                  currentEntryStatus === PICK_SET_STATUS.COMPLETE
                    ? "Complete"
                    : "Draft"
                }
              />
            </Stack>
            <Stack spacing={0.75}>
              <Typography variant="body2">
                {completedPicks} / {totalPicks} picks complete
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 10, borderRadius: 999 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Payment status: {currentEntry.paymentStatus || "unpaid"}
            </Typography>
            <Button component={RouterLink} to="/picks" variant="contained">
              {actionLabel}
            </Button>
          </Stack>
        </Panel>
      )}
    </Stack>
  );
};

export default EntriesPage;
