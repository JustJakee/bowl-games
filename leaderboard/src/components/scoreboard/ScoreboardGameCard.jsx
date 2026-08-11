// UI — SCOREBOARD — REACT
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import TeamLogo from "../common/TeamLogo";
import Panel from "../common/Panel";
import { isFinalScoreboardGame, isLiveScoreboardGame } from "../../utils/scoreboardGames";
import { getFinalGameWinner, getGameStatusPresentation } from "../../utils/gameStatusPresentation";

const TeamRow = ({ team, score, showScore, isWinner, isFinal, winnerText }) => {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
      sx={isWinner ? {
        px: 0.5,
        py: 0.2,
        borderRadius: 0.75,
        backgroundColor: "rgba(245, 248, 255, 0.09)",
      } : undefined}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ minWidth: 0 }}
      >
        <TeamLogo
          src={team?.logo}
          alt={`${team?.displayName || team?.abbr || "Team"} logo`}
          abbr={team?.abbr}
          size={24}
        />
        <Typography
          variant="body2"
          sx={{
            color: isWinner ? winnerText : "text.primary",
            fontWeight: isWinner ? 900 : 700,
            fontSize: "0.9rem",
            opacity: isFinal && !isWinner ? 0.72 : 1,
          }}
        >
          {team?.abbr || "TBD"}
        </Typography>
      </Stack>
      {showScore ? (
        <Stack direction="row" spacing={0.55} alignItems="center">
          <Typography variant="body2" sx={{ color: isWinner ? winnerText : "text.primary", fontWeight: isWinner ? 900 : 800, fontSize: isWinner ? "1.12rem" : "1rem" }}>
            {score}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
};

const ScoreboardGameCard = ({ game }) => {
  const theme = useTheme();
  const isLive = isLiveScoreboardGame(game);
  const isFinal = isFinalScoreboardGame(game);
  const finalPresentation = getGameStatusPresentation("final");
  const winnerTeam = isFinal ? getFinalGameWinner(game) : "";
  const showScores = isLive || isFinal;
  const score = (team) => team?.score === null || team?.score === undefined || team.score === "" ? "--" : team.score;

  return (
    <Panel
      elevated
      sx={{
        minWidth: 250,
        maxWidth: 275,
        minHeight: 112,
        p: 1.5,
        flex: "0 0 auto",
        borderRadius: (theme) => theme.customShape?.scoreboardRadius ?? 6,
        borderColor: isFinal ? finalPresentation.accent : undefined,
        backgroundColor: isFinal ? finalPresentation.cardBackground : undefined,
      }}
    >
      <Stack spacing={1}>
        <Box>
          {isLive ? (
            <Chip
              size="small"
              label="LIVE"
              color="primary"
              sx={{ height: 21, mb: 0.65, mr: 0.75, fontSize: "0.68rem", letterSpacing: ".08em" }}
            />
          ) : null}
          {isFinal ? (
            <Chip
              size="small"
              label="FINAL"
              sx={{
                height: 21,
                mb: 0.65,
                mr: 0.75,
                backgroundColor: finalPresentation.badgeBackground,
                border: `1px solid ${finalPresentation.badgeBorder}`,
                color: finalPresentation.badgeText,
                fontSize: "0.68rem",
                fontWeight: 900,
                letterSpacing: ".08em",
              }}
            />
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.7rem" }}
          >
            {isLive
              ? game.statusText || "Live"
              : isFinal
                ? game.statusText || "Final"
              : `${game.startDateText || "Date TBD"} ${game.startTimeText || "TBD"}`}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "0.78rem",
              fontWeight: 800,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {game.bowl || "Bowl Game"}
          </Typography>
        </Box>
        <Stack spacing={0.75}>
          <TeamRow
            team={game.away}
            score={score(game.away)}
            showScore={showScores}
            isFinal={isFinal}
            isWinner={winnerTeam === game.away?.abbr}
            winnerText={finalPresentation.winnerText}
          />
          <TeamRow
            team={game.home}
            score={score(game.home)}
            showScore={showScores}
            isFinal={isFinal}
            isWinner={winnerTeam === game.home?.abbr}
            winnerText={finalPresentation.winnerText}
          />
        </Stack>
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            mt: 1,
            pt: 0.75,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.7rem", textAlign: "left" }}
          >
            {game.network || "Network TBD"}
          </Typography>
        </Box>
      </Stack>
    </Panel>
  );
};

export default ScoreboardGameCard;
