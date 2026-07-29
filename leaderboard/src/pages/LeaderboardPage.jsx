// UI — LEADERBOARD — REACT
import { Alert, Stack } from "@mui/material";
import Leaderboard from "../components/Leaderboard.jsx";
import { useAppData } from "../app/AppDataContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";
import LeaderboardHeader from "../features/leaderboard/LeaderboardHeader";
import { toLeaderboardEntries } from "../features/leaderboard/leaderboardViewModel";

const LeaderboardPage = () => {
  const { picksLocked, currentSeasonYear } = useAppData();
  const { rows, loading, error } = useSeasonLeaderboard();
  const leaderboardEntries = toLeaderboardEntries(rows);
  const isLiveLeaderboard = picksLocked;

  return (
    <Stack className="leaderboard-page" spacing={2}>
      <LeaderboardHeader
        isLive={isLiveLeaderboard}
        picksLocked={picksLocked}
        seasonYear={currentSeasonYear}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Leaderboard
        entries={leaderboardEntries}
        loading={loading}
        isLive={isLiveLeaderboard}
      />
    </Stack>
  );
};

export default LeaderboardPage;
