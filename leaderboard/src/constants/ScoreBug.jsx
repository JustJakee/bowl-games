import { Box, Stack, Typography, Avatar, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function ScoreBug({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  statusLine,
  bowlGame,
  network,
  isLive,
  gameId,
  sx
}) {
  const theme = useTheme();
  const espnLink = `https://www.espn.com/college-football/game/_/gameId/${gameId}/`;

  const cardBg = theme.palette.common.black;
  const pillBg =
    theme.palette.mode === "dark"
      ? alpha("#ffffff", 0.12)
      : alpha("#000000", 0.06);

  return (
    <Box
      sx={{
        bgcolor: cardBg,
        borderRadius: 5,
        p: 2,
        outline: "none",
        ...sx,
      }}
      onClick={() => {window.open(espnLink, '_blank');}}
    >
      {bowlGame && (
        <Typography
          variant="h6"
          align="center"
          fontWeight={700}
          sx={{
            color: alpha(theme.palette.common.white, 0.9),
            maxWidth: 360,
            mx: "auto",
          }}
        >
          {bowlGame}
        </Typography>
      )}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        justifyContent="center"
        sx={{ mb: 1.25 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Typography variant="h6" fontWeight={700} color="common.white">
            {awayTeam?.code}
          </Typography>
          {awayTeam?.logoUrl && (
            <Avatar
              src={awayTeam.logoUrl}
              alt={`${awayTeam.code} logo`}
              sx={{ width: 28, height: 28 }}
              imgProps={{ loading: "lazy" }}
            />
          )}
        </Stack>
        <Box
          sx={{
            px: 2.25,
            py: 0.75,
            borderRadius: 999,
            bgcolor: pillBg,
            boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.22)}`,
            minWidth: 92,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
            letterSpacing={1}
            sx={{
              color: theme.palette.mode === "dark" ? "#EAF1FF" : "#a3a3a3af",
            }}
          >
            {awayScore} - {homeScore}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.25}>
          {homeTeam?.logoUrl && (
            <Avatar
              src={homeTeam.logoUrl}
              alt={`${homeTeam.code} logo`}
              sx={{ width: 28, height: 28 }}
              imgProps={{ loading: "lazy" }}
            />
          )}
          <Typography variant="h6" fontWeight={700} color="common.white">
            {homeTeam?.code}
          </Typography>
        </Stack>
      </Stack>

      {statusLine && (
        <Typography
          variant="subtitle2"
          sx={{
            color: isLive ? theme.palette.error.main : "#a3a3a3af" ,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            textAlign: "center",
            mb: 0.5,
          }}
        >
          {statusLine}
        </Typography>
      )}

      {network && (
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: alpha(theme.palette.common.white, 0.9),
            maxWidth: 360,
            mx: "auto",
          }}
        >
          {network}
        </Typography>
      )}
    </Box>
  );
}
