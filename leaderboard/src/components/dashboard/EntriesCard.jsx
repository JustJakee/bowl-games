import { Button, LinearProgress, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import StatusChip from "../common/StatusChip";

const EntriesCard = ({ entry }) => {
  if (!entry) {
    return (
      <Panel sx={{ height: "100%" }}>
        <Stack spacing={1.5}>
          <SectionHeader
            title="My Pick Set"
            actionLabel="Create Your Pick Set"
            actionTo="/picks"
          />
          <Stack spacing={0.75}>
            <Typography
              variant="subtitle1"
              sx={{ fontSize: "1rem", fontWeight: 700 }}
            >
              No pick set yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}
            >
              Create your pick set to start choosing bowl winners.
            </Typography>
          </Stack>
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={1.5}>
        <SectionHeader
          title="My Pick Set"
          actionLabel="View Pick Set"
          actionTo="/entries"
        />
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <div>
              <Typography fontWeight={700}>{entry.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {entry.completedPicks} / {entry.totalPicks} complete
              </Typography>
            </div>
            <StatusChip label={entry.status} />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={
              entry.totalPicks > 0
                ? Math.round((entry.completedPicks / entry.totalPicks) * 100)
                : 0
            }
            sx={{ height: 9, borderRadius: 999 }}
          />
          <Button component={RouterLink} to="/picks" variant="contained">
            {entry.isComplete
              ? "Review Your Picks"
              : "Continue Your Picks"}
          </Button>
        </Stack>
      </Stack>
    </Panel>
  );
};

export default EntriesCard;
