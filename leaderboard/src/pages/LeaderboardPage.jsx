// UI — LEADERBOARD — REACT
import { Alert, Button, Stack } from "@mui/material";
import Leaderboard from "../components/Leaderboard.jsx";
import { useAppData } from "../app/AppDataContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import LeaderboardHeader from "../features/leaderboard/LeaderboardHeader";
import { toLeaderboardEntries } from "../features/leaderboard/leaderboardViewModel";
import PageLoading from "../components/common/PageLoading.jsx";
import { isLeaderboardPageLoading } from "../utils/pageReadiness.js";
import { usePrizeSummary } from "../hooks/usePrizeSummary.js";
import { calculatePayouts, parsePayoutTiers } from "../../shared/prizeRules.mjs";

const LeaderboardPage = () => {
  const { picksLocked, currentSeasonYear } = useAppData();
  const {
    error: scoreboardError,
    errorIsConnectivity: scoreboardErrorIsConnectivity,
    connectionStatus,
    loading: scoreboardLoading,
    reload: reloadScoreboard,
    season,
  } = useScoreboard();
  const {
    rows,
    loading,
    error,
    errorIsConnectivity,
    ready,
    seasonId: leaderboardSeasonId,
    reload: reloadLeaderboard,
  } = useSeasonLeaderboard();
  const { summary: prizeSummary } = usePrizeSummary();
  let payoutsByPosition = {};
  try {
    const tiers = parsePayoutTiers(prizeSummary?.payoutConfigJson);
    if (tiers && prizeSummary) {
      payoutsByPosition = Object.fromEntries(
        calculatePayouts(prizeSummary.prizePoolCents, tiers)
          .map((tier) => [tier.position, tier.payoutCents]),
      );
    }
  } catch {
    // An invalid or unavailable distribution is never replaced with invented prizes.
  }
  const leaderboardEntries = toLeaderboardEntries(rows);
  const isLiveLeaderboard = picksLocked;
  const pageLoading = isLeaderboardPageLoading({
    leaderboardError: error,
    leaderboardReady: ready,
    leaderboardSeasonId,
    scoreboardError,
    scoreboardLoading,
    seasonId: season?.id,
  });

  if (pageLoading) {
    return <PageLoading loading message="Loading leaderboard..." />;
  }

  const criticalError = scoreboardError || error;
  const connectivityFailure = scoreboardError
    ? scoreboardErrorIsConnectivity
    : errorIsConnectivity;
  const showCurrentRows =
    ready && leaderboardSeasonId === String(season?.id || "");

  return (
    <Stack className="leaderboard-page" spacing={2}>
      <LeaderboardHeader
        isLive={isLiveLeaderboard}
        picksLocked={picksLocked}
        seasonYear={currentSeasonYear}
      />
      {criticalError && !(connectivityFailure && connectionStatus !== "ready") ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => { reloadScoreboard(); reloadLeaderboard(); }}
            >
              Retry
            </Button>
          }
        >
          {connectivityFailure ? "Leaderboard is unavailable while disconnected." : criticalError}
        </Alert>
      ) : null}
      {showCurrentRows || !criticalError ? (
        <Leaderboard
          entries={leaderboardEntries}
          loading={loading && !showCurrentRows}
          isLive={isLiveLeaderboard}
          payoutsByPosition={payoutsByPosition}
        />
      ) : <Alert severity="warning">Leaderboard is unavailable. Retry when connected.</Alert>}
    </Stack>
  );
};

export default LeaderboardPage;
