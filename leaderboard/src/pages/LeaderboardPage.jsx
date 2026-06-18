import { Alert, Stack } from "@mui/material";
import Leaderboard from "../components/Leaderboard.jsx";
import Panel from "../components/common/Panel";
import { useAppData } from "../app/AppDataContext.jsx";

const LeaderboardPage = () => {
  const { matchups, playerPicks, picksLoading, picksError } = useAppData();

  return (
    <Stack spacing={2}>
      {picksError ? <Alert severity="error">{picksError}</Alert> : null}
      <Panel elevated sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Leaderboard playerPicks={playerPicks} matchups={matchups} loading={picksLoading} />
      </Panel>
    </Stack>
  );
};

export default LeaderboardPage;
