import { Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Panel from "../common/Panel";
import useCountdown from "../../hooks/useCountdown";
import { formatDeadline } from "../../utils/countdown";

const PicksLockSummary = ({ deadline, compact = false }) => {
  const countdown = useCountdown(deadline);

  return (
    <Panel elevated sx={{ height: "100%" }}>
      <Stack spacing={compact ? 1 : 1.5}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <LockOutlinedIcon sx={{ color: "primary.main" }} />
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontSize: { md: "0.8rem", lg: "0.85rem" } }}
          >
            Picks Lock
          </Typography>
        </Stack>
        <Typography
          variant={compact ? "subtitle1" : "h6"}
          sx={{ fontSize: compact ? undefined : { md: "1rem", lg: "1.05rem" } }}
        >
          {formatDeadline(deadline)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { md: "0.875rem" } }}>
          {countdown}
        </Typography>
      </Stack>
    </Panel>
  );
};

export default PicksLockSummary;
