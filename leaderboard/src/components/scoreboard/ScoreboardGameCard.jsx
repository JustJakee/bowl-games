import { Box, Stack, Typography } from "@mui/material";
import TeamLogo from "../common/TeamLogo";
import Panel from "../common/Panel";

const TeamRow = ({ team, score, showScore }) => {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <TeamLogo
          src={team?.logo}
          alt={`${team?.displayName || team?.abbr || "Team"} logo`}
          abbr={team?.abbr}
          size={24}
        />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {team?.abbr || "TBD"}
        </Typography>
      </Stack>
      {showScore ? (
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          {score}
        </Typography>
      ) : null}
    </Stack>
  );
};

const ScoreboardGameCard = ({ game }) => {
  const showScores = game?.state === "in" || game?.state === "post" || game?.isFinal;

  return (
    <Panel
      elevated
      sx={{
        minWidth: 220,
        p: 1.5,
        flex: "0 0 auto",
      }}
    >
      <Stack spacing={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {showScores ? game.statusText || "Final" : `${game.startDateText || "Date TBD"} • ${game.startTimeText || "TBD"}`}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {game.bowl || "Bowl Game"}
          </Typography>
        </Box>
        <Stack spacing={0.75}>
          <TeamRow team={game.away} score={game.away?.score || "--"} showScore={showScores} />
          <TeamRow team={game.home} score={game.home?.score || "--"} showScore={showScores} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {game.network || "Network TBD"}
        </Typography>
      </Stack>
    </Panel>
  );
};

export default ScoreboardGameCard;
