import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import Panel from "../components/common/Panel";
import { useAppData } from "../app/AppDataContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import ChangePasswordDialog from "../auth/ChangePasswordDialog.jsx";
import FavoriteTeamDialog from "../components/account/FavoriteTeamDialog.jsx";
import TeamAvatar from "../components/account/TeamAvatar.jsx";
import useFbsTeams from "../hooks/useFbsTeams.js";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import PageLoading from "../components/common/PageLoading.jsx";
import { isAccountPageLoading } from "../utils/pageReadiness.js";
import { getDashboardPaymentState } from "../utils/dashboardVisibility.js";

const PAYMENT_STATE = Object.freeze({
  PAID: "paid",
  UNPAID: "unpaid",
  LOADING: "loading",
  UNAVAILABLE: "unavailable",
});

export const resolveAccountPaymentState = ({
  currentEntry,
  entriesLoading,
  entriesReady,
}) => {
  if (entriesLoading) return PAYMENT_STATE.LOADING;
  if (!entriesReady || !currentEntry) return PAYMENT_STATE.UNAVAILABLE;
  const status = getDashboardPaymentState(currentEntry);
  return [PAYMENT_STATE.PAID, PAYMENT_STATE.UNPAID].includes(status)
    ? status
    : PAYMENT_STATE.UNAVAILABLE;
};

const paymentPresentation = {
  [PAYMENT_STATE.PAID]: {
    badge: "Paid",
    title: "Payment Confirmed",
    message: "Your picks have been marked as paid.",
    color: "success",
    Icon: CheckCircleRoundedIcon,
  },
  [PAYMENT_STATE.UNPAID]: {
    badge: "Unpaid",
    title: "Payment Pending",
    message: "Your picks are currently unpaid, please pay Jake or Bob Koons",
    color: "warning",
    Icon: PaymentsOutlinedIcon,
  },
  [PAYMENT_STATE.LOADING]: {
    badge: "Loading",
    title: "Payment Status",
    message: "Payment information is loading.",
    color: "default",
    Icon: PaymentsOutlinedIcon,
  },
  [PAYMENT_STATE.UNAVAILABLE]: {
    badge: "Unavailable",
    title: "Payment Status",
    message: "Payment status is currently unavailable.",
    color: "default",
    Icon: PaymentsOutlinedIcon,
  },
};

const PaymentBadge = ({ paymentState }) => {
  const presentation = paymentPresentation[paymentState];
  const { Icon } = presentation;

  return (
    <Chip
      size="small"
      icon={<Icon />}
      label={presentation.badge}
      color={presentation.color}
      variant={presentation.color === "default" ? "outlined" : "filled"}
      sx={{ flex: "0 0 auto", fontWeight: 800 }}
    />
  );
};

const PaymentStatusPanel = ({ paymentState }) => {
  const presentation = paymentPresentation[paymentState];
  const { Icon } = presentation;
  const isPaid = paymentState === PAYMENT_STATE.PAID;
  const isUnpaid = paymentState === PAYMENT_STATE.UNPAID;

  return (
    <Panel
      component="section"
      aria-labelledby="payment-status-heading"
      sx={{
        p: { xs: 2, sm: 2.25 },
        borderColor: (theme) =>
          isPaid
            ? alpha(theme.palette.success.main, 0.42)
            : isUnpaid
              ? alpha(theme.palette.warning.main, 0.48)
              : alpha(theme.palette.divider, 0.9),
        backgroundColor: (theme) =>
          isPaid
            ? alpha(theme.palette.success.main, 0.08)
            : isUnpaid
              ? alpha(theme.palette.warning.main, 0.07)
              : alpha(theme.palette.background.paper, 0.82),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            flex: "0 0 auto",
            borderRadius: 1,
            color: isPaid
              ? "success.main"
              : isUnpaid
                ? "warning.main"
                : "text.secondary",
            backgroundColor: (theme) =>
              alpha(
                isPaid
                  ? theme.palette.success.main
                  : isUnpaid
                    ? theme.palette.warning.main
                    : theme.palette.text.secondary,
                0.11,
              ),
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            id="payment-status-heading"
            variant="subtitle1"
            sx={{ fontWeight: 800 }}
          >
            {presentation.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {presentation.message}
          </Typography>
        </Box>
      </Stack>
    </Panel>
  );
};

const SettingsCard = ({
  icon: Icon,
  title,
  description,
  badge,
  headerVisual,
  children,
}) => (
  <Panel
    elevated
    component="section"
    sx={{
      height: "100%",
      minWidth: 0,
      p: { xs: 2.25, sm: 2.5 },
    }}
  >
    <Stack spacing={2.25} sx={{ height: "100%" }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
      >
        {headerVisual || (
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontSize: "1.05rem" }}>
            {title}
          </Typography>
        </Box>
        {badge}
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1.55 }}
      >
        {description}
      </Typography>
      {children}
    </Stack>
  </Panel>
);

const InformationRow = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ display: "block", lineHeight: 1.4, letterSpacing: "0.07em" }}
    >
      {label}
    </Typography>
    <Typography
      variant="body1"
      sx={{ mt: 0.5, fontWeight: 700, overflowWrap: "anywhere" }}
    >
      {value}
    </Typography>
  </Box>
);

export const AccountSettingsView = ({
  email = "",
  favoriteTeam = null,
  favoriteTeamId = "",
  favoriteTeamLoading = false,
  onChooseFavoriteTeam,
  onChangePassword,
  paymentState = PAYMENT_STATE.UNAVAILABLE,
  username = "",
}) => (
  <Box sx={{ width: "100%", maxWidth: 1080, mx: "auto", minWidth: 0 }}>
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      <Stack
        component="header"
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontSize: { xs: "1.75rem", sm: "2rem" },
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Account Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your player account
          </Typography>
        </Box>
        <PaymentBadge paymentState={paymentState} />
      </Stack>

      <PaymentStatusPanel paymentState={paymentState} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        <SettingsCard
          icon={AccountCircleOutlinedIcon}
          title="Profile Information"
          description="Your player details for Bob's Bowl Games."
          headerVisual={
            <TeamAvatar
              team={favoriteTeam}
              size={40}
              fallbackIcon={<AccountCircleOutlinedIcon fontSize="small" />}
            />
          }
        >
          <Divider />
          <Stack spacing={2}>
            <InformationRow label="Username" value={username || "Not set"} />
            <Divider />
            <InformationRow
              label="Email address"
              value={email || "Unavailable"}
            />
          </Stack>
        </SettingsCard>

        <SettingsCard
          icon={SportsFootballRoundedIcon}
          title="Favorite Team"
          description={
            favoriteTeam
              ? favoriteTeam.displayName
              : favoriteTeamLoading
                ? "Loading favorite team..."
                : favoriteTeamId
                  ? "Favorite team details are unavailable."
                  : "Choose your favorite college football team."
          }
          headerVisual={
            favoriteTeam ? <TeamAvatar team={favoriteTeam} size={40} /> : null
          }
        >
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            onClick={onChooseFavoriteTeam}
            fullWidth
            sx={{ minHeight: 44 }}
          >
            {favoriteTeamId ? "Change Favorite Team" : "Select Favorite Team"}
          </Button>
        </SettingsCard>

        <SettingsCard
          icon={LockOutlinedIcon}
          title="Security"
          description="Manage your account password."
        >
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            onClick={onChangePassword}
            fullWidth
            sx={{ minHeight: 44 }}
          >
            Change Password
          </Button>
        </SettingsCard>
      </Box>
    </Stack>
  </Box>
);

const MorePage = () => {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [favoriteTeamOpen, setFavoriteTeamOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { email } = useAuth();
  const { profile, updateFavoriteTeam } = useUserProfile();
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    retry: retryTeams,
  } = useFbsTeams();
  const {
    currentEntry,
    currentSeasonId,
    entriesError,
    entriesErrorIsConnectivity,
    entriesRefreshError,
    entriesLoading,
    entriesReady,
    reloadEntries,
  } = useAppData();
  const { error: scoreboardError, errorIsConnectivity: scoreboardErrorIsConnectivity, connectionStatus, loading: scoreboardLoading, reload: reloadScoreboard } =
    useScoreboard();
  const paymentState = resolveAccountPaymentState({
    currentEntry,
    entriesLoading,
    entriesReady,
  });
  const favoriteTeamId = String(profile?.favoriteTeamId || "");
  const favoriteTeam = teams.find((team) => team.id === favoriteTeamId) || null;
  const pageLoading = isAccountPageLoading({
    entriesError,
    entriesLoading,
    entriesReady,
    scoreboardError,
    scoreboardLoading,
    seasonId: currentSeasonId,
  });

  if (pageLoading) {
    return <PageLoading loading message="Loading account..." />;
  }

  return (
    <>
      {(scoreboardError || entriesError || entriesRefreshError) &&
        !((scoreboardErrorIsConnectivity || entriesErrorIsConnectivity || entriesRefreshError) && connectionStatus !== "ready") ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (scoreboardError) void reloadScoreboard();
                if (entriesError) void reloadEntries();
              }}
            >
              Retry
            </Button>
          }
        >
          Season or entry data is unavailable. Payment status cannot be confirmed.
        </Alert>
      ) : null}
      <AccountSettingsView
        email={email || ""}
        favoriteTeam={favoriteTeam}
        favoriteTeamId={favoriteTeamId}
        favoriteTeamLoading={teamsLoading && Boolean(favoriteTeamId)}
        onChooseFavoriteTeam={() => setFavoriteTeamOpen(true)}
        onChangePassword={() => setChangePasswordOpen(true)}
        paymentState={paymentState}
        username={profile?.username || ""}
      />
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={setSuccessMessage}
      />
      <FavoriteTeamDialog
        open={favoriteTeamOpen}
        savedTeamId={favoriteTeamId}
        teams={teams}
        loading={teamsLoading}
        error={teamsError}
        onRetry={retryTeams}
        onClose={() => setFavoriteTeamOpen(false)}
        onSave={updateFavoriteTeam}
      />
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={5000}
        onClose={(_event, reason) => {
          if (reason !== "clickaway") setSuccessMessage("");
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage("")}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MorePage;
