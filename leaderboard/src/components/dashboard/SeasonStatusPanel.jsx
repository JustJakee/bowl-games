import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";
import PaymentStatusChip from "../common/PaymentStatusChip";
import useCountdown from "../../hooks/useCountdown";
import { formatDeadline } from "../../utils/countdown";

const iconMap = {
  schedule: ScheduleRoundedIcon,
  rules: GavelRoundedIcon,
  account: ManageAccountsRoundedIcon,
};

const SeasonStatusPanel = ({
  deadline,
  links,
  picksLocked = false,
  paymentStatus,
  hasEntry = false,
}) => {
  const countdown = useCountdown(deadline);

  return (
    <Panel elevated sx={{ height: "100%" }}>
      <Stack spacing={1.5}>
        <Typography
          variant="h6"
          sx={{
            textTransform: "uppercase",
            color: "primary.main",
            fontSize: { md: "1rem", lg: "1.1rem" },
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          Season Status
        </Typography>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
            <LockOutlinedIcon sx={{ color: "primary.main" }} />
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontSize: "0.8rem" }}
            >
              {picksLocked ? "Picks Locked" : "Picks Lock"}
            </Typography>
            {hasEntry ? <PaymentStatusChip paymentStatus={paymentStatus} /> : null}
          </Stack>
          {!picksLocked ? (
            <Typography
              variant="subtitle1"
              sx={{ fontSize: "1rem", fontWeight: 700 }}
            >
              {formatDeadline(deadline)}
            </Typography>
          ) : null}
          {picksLocked ? (
            <Stack spacing={0.45}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                Your picks are locked for the season.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
                Follow the schedule, live scores, and leaderboard throughout the bowl season.
              </Typography>
            </Stack>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem", lineHeight: 1.4 }}
            >
              {countdown}
            </Typography>
          )}
        </Stack>
        <Divider sx={{ my: 0.5 }} />
        <Stack spacing={0}>
          {links.map((link, index) => {
            const Icon = iconMap[link.icon] || ManageAccountsRoundedIcon;

            return (
              <Box
                key={link.to}
                component={RouterLink}
                to={link.to}
                aria-label={link.label}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  alignItems: "center",
                  minHeight: 52,
                  py: 1.25,
                  columnGap: 1.25,
                  textDecoration: "none",
                  color: "inherit",
                  borderBottom: index < links.length - 1 ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <Icon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.95rem", fontWeight: 700 }}
                >
                  {link.label}
                </Typography>
                <ChevronRightRoundedIcon
                  sx={{ color: "text.secondary", fontSize: 18 }}
                />
              </Box>
            );
          })}
        </Stack>
        <Box sx={{ pt: 0.5 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.875rem", lineHeight: 1.45 }}
          >
            {picksLocked
              ? ""
              : "Make sure your pick set is finished before the global pick deadline. Leaderboard and games stay live throughout the season."}
          </Typography>
        </Box>
      </Stack>
    </Panel>
  );
};

export default SeasonStatusPanel;
