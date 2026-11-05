// UI — LEADERBOARD — REACT
import { Alert, Stack } from "@mui/material";
import Leaderboard from "../components/Leaderboard.jsx";
import { useAppData } from "../app/AppDataContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import LeaderboardHeader from "../features/leaderboard/LeaderboardHeader";
import { toLeaderboardEntries } from "../features/leaderboard/leaderboardViewModel";
import PageLoading from "../components/common/PageLoading.jsx";
import { isLeaderboardPageLoading } from "../utils/pageReadiness.js";

const LeaderboardPage = () => {
  const { picksLocked, currentSeasonYear } = useAppData();
  const {
    error: scoreboardError,
    loading: scoreboardLoading,
    season,
  } = useScoreboard();
  const {
    rows,
    loading,
    error,
    ready,
    seasonId: leaderboardSeasonId,
  } = useSeasonLeaderboard();
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
  const showCurrentRows =
    ready && leaderboardSeasonId === String(season?.id || "");

  return (
    <Stack className="leaderboard-page" spacing={2}>
      <LeaderboardHeader
        isLive={isLiveLeaderboard}
        picksLocked={picksLocked}
        seasonYear={currentSeasonYear}
      />
      {criticalError ? <Alert severity="error">{criticalError}</Alert> : null}
      {!criticalError || showCurrentRows ? (
        <Leaderboard
          entries={leaderboardEntries}
          loading={loading && !showCurrentRows}
          isLive={isLiveLeaderboard}
        />
      ) : null}
    </Stack>
  );
};

export default LeaderboardPage;
