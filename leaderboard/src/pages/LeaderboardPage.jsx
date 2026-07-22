// UI — LEADERBOARD — REACT
import { Alert, Stack } from "@mui/material";
import Leaderboard from "../components/Leaderboard.jsx";
import Panel from "../components/common/Panel";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { useSeasonLeaderboard } from "../hooks/useSeasonLeaderboard";

const LeaderboardPage = () => {
  const { allGames } = useScoreboard();
  const { rows, loading, error } = useSeasonLeaderboard();

  const matchups = allGames.map((game) => ({
    id: game.id,
    game: game.bowl,
    winner: game.winnerTeam || "",
    gameTotal: Number(game?.home?.score || 0) + Number(game?.away?.score || 0),
  }));

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Panel elevated sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Leaderboard rows={rows} matchups={matchups} loading={loading} />
      </Panel>
    </Stack>
  );
};

export default LeaderboardPage;
