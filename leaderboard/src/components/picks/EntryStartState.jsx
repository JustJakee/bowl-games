import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import Panel from "../common/Panel";

// A successful empty read is distinct from an authorization/network failure.
export default function EntryStartState({
  ready,
  error,
  createError,
  creating,
  isAdmin,
  gameCount,
  onStart,
  onRetry,
}) {
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography
          variant="h3"
          sx={{ fontSize: { xs: "2rem", md: "2.25rem" } }}
        >
          My Picks
        </Typography>
      </Box>
      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={onRetry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : !ready ? (
        <Panel elevated>
          <Typography>Loading your entry...</Typography>
        </Panel>
      ) : (
        <>
          {createError ? <Alert severity="error">{createError}</Alert> : null}
          <Panel elevated>
            <Stack spacing={2}>
              <Typography variant="h5">Create Your Entry</Typography>
              <Typography variant="body2" color="text.secondary">
                You have {gameCount} bowl games to pick. Make your predictions
                before the deadline.
              </Typography>
              {isAdmin ? (
                <Alert severity="info">
                  Admin accounts cannot create player entries.
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  onClick={onStart}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Start Making Picks"}
                </Button>
              )}
            </Stack>
          </Panel>
        </>
      )}
    </Stack>
  );
}
