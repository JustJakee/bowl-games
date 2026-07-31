import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import { formatDeadline } from "../../utils/countdown";

const paymentStatusDetails = (paymentStatus) => {
  switch (String(paymentStatus || "UNPAID").toUpperCase()) {
    case "PAID":
      return { label: "Paid", color: "success" };
    case "WAIVED":
      return { label: "Waived", color: "info" };
    case "REFUNDED":
      return { label: "Refunded", color: "default" };
    default:
      return { label: "Unpaid", color: "warning" };
  }
};

const EntriesCard = ({ entry, paymentStatus, deadline }) => {
  const theme = useTheme();

  if (!entry) {
    return (
      <Panel sx={{ height: "100%" }}>
        <Stack spacing={1.5}>
          <SectionHeader title="My Pick Set" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            No pick set yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your pick set from My Picks to start choosing bowl winners.
          </Typography>
        </Stack>
      </Panel>
    );
  }

  const progress =
    entry.totalPicks > 0
      ? Math.round((entry.completedPicks / entry.totalPicks) * 100)
      : 0;
  const remainingPicks = Math.max(entry.totalPicks - entry.completedPicks, 0);
  const isComplete = entry.isComplete && entry.totalPicks > 0;
  const payment = paymentStatusDetails(paymentStatus);
  const completionMessage = isComplete
    ? "All picks are in. You're ready for the season."
    : entry.totalPicks === 0
      ? "Pick progress will appear once games are available."
      : `${remainingPicks} pick${remainingPicks === 1 ? "" : "s"} remaining before the deadline.`;

  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={1.75}>
        <SectionHeader title="My Pick Set" />

        <Stack direction="row" justifyContent="space-between" spacing={1.25}>
          <Typography
            variant="subtitle1"
            sx={{ minWidth: 0, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {entry.name || "My Pick Set"}
          </Typography>
          <Chip
            size="small"
            label={isComplete ? "Complete" : "Incomplete"}
            color={isComplete ? "success" : "warning"}
            sx={{ flexShrink: 0, fontWeight: 800 }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.75} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Box sx={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={82}
              thickness={4}
              sx={{ color: alpha(theme.palette.common.white, 0.1) }}
            />
            <CircularProgress
              variant="determinate"
              value={progress}
              size={82}
              thickness={4}
              color={isComplete ? "success" : "primary"}
              aria-label={`${progress}% of picks complete`}
              sx={{ position: "absolute", left: 0 }}
            />
            <Box sx={{ inset: 0, position: "absolute", display: "grid", placeItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                {progress}%
              </Typography>
            </Box>
          </Box>
          <Stack spacing={0.35}>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {entry.completedPicks} / {entry.totalPicks}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              Picks Complete
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completionMessage}
            </Typography>
          </Stack>
        </Stack>

        <Divider />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Payment Status
            </Typography>
            <Box sx={{ mt: 0.3 }}>
              <Chip size="small" label={payment.label} color={payment.color} sx={{ fontWeight: 800 }} />
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Pick Deadline
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.3, fontWeight: 700, lineHeight: 1.35 }}>
              {formatDeadline(deadline)}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Panel>
  );
};

export default EntriesCard;
