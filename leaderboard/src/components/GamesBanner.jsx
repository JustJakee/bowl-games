import { useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import LiveGlowIcon from "../constants/LiveGlowIcon";
import { useScoreboard } from "../context/NCAAFDataContext";
import "../styles/games-banner.css";

const GamesBanner = ({
  hideOnSmall = true,
  header = "Bowl Games",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { games: scoreboardGames, loading, error } = useScoreboard();

  const games = useMemo(() => {
    return (scoreboardGames || [])
      .slice()
      .sort((a, b) => {
        const liveA = a.state === "in";
        const liveB = b.state === "in";
        if (liveA !== liveB) return Number(liveB) - Number(liveA);
        if (a.isFinal !== b.isFinal)
          return Number(b.isFinal) - Number(a.isFinal);
        return 0;
      })
      .slice(0, 20);
  }, [scoreboardGames]);

  const renderTeamRow = (team, key, gameState) => {
    if (!team) return null;
    const displayScore =
      team.score !== "" ? team.score : gameState === "pre" ? "" : "--";
    return (
      <Box key={key} className="games-banner__team">
        <Box className="games-banner__team-info">
          {team.logo ? (
            <Box
              component="img"
              src={team.logo}
              alt={team.abbr || "Team logo"}
              className="games-banner__team-logo"
              loading="lazy"
            />
          ) : (
            <Box className="games-banner__team-logo games-banner__team-logo--placeholder">
              <SportsFootballIcon fontSize="inherit" />
            </Box>
          )}
          {team.rank <= 25 ? ( // only show top 25 teams ranks
            <Typography component="span" className="games-banner__team-rank">
              {team.rank}
            </Typography>
          ) : null}
          <Typography component="span" className="games-banner__team-name">
            {team.abbr || "TBD"}
          </Typography>
        </Box>
        <Typography component="span" className="games-banner__score">
          {displayScore}
        </Typography>
      </Box>
    );
  };

  if (hideOnSmall && isMobile) return null;

  return (
    <Box
      role="region"
      aria-label="Games Banner"
      aria-live="polite"
      className="games-banner"
    >
      <Box
        className="games-banner__label"
        sx={{ display: { xs: "none", sm: "inline-flex" } }}
      >
        <Typography variant="caption" fontWeight={800}>
          {header}
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2">Loading...</Typography>
        </Box>
      )}

      {!loading && error && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#ffb4ab",
          }}
        >
          <ErrorOutlineIcon fontSize="small" />
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      {!loading && !error && (
        <Box className="games-banner__carousel">
          <Box className="games-banner__scroller" tabIndex={0}>
            {games.length === 0 && (
              <Typography
                variant="body2"
                color="var(--color-muted)"
                sx={{ px: 2, display: "flex", alignItems: "center" }}
              >
                No games found.
              </Typography>
            )}

            {games.map((game, idx) => (
              <Box
                key={game.id || `${game.bowl}-${idx}`}
                className="games-banner__card"
              >
                {game.bowl && (
                  <Typography variant="overline" className="games-banner__bowl">
                    {game.bowl}
                  </Typography>
                )}
                <Typography variant="caption" className="games-banner__meta">
                  <span>
                    {game.statusText}
                    {game.state === "in" && (
                      <LiveGlowIcon className="games-banner__live-badge" />
                    )}
                  </span>
                  {game.network ? (
                    <span className="games-banner__meta-network">
                      {game.network}
                    </span>
                  ) : null}
                </Typography>
                <Box className="games-banner__teams">
                  {renderTeamRow(game.away, "away", game.state)}
                  {renderTeamRow(game.home, "home", game.state)}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GamesBanner;
