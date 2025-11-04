import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SportsFootballIcon from "@mui/icons-material/SportsFootball";
import LiveGlowIcon from "../constants/LiveGlowIcon"
import { fetchNcaafScoreboard } from "../api/espn";
import "../styles/games-banner.css";

const getNetwork = (comp) =>
  comp?.broadcasts?.[0]?.shortName || comp?.broadcasts?.[0]?.names?.[0] || "";
const getBowlName = (comp) => comp?.notes?.[0]?.headline || comp?.name || "";
const fmtKickoff = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
};

const formatGame = (event) => {
  const comp = event?.competitions?.[0] || {};
  const state = comp?.status?.type?.state || event?.status?.type?.state || "";
  const status =
    comp?.status?.type?.shortDetail || event?.status?.type?.shortDetail || "";
  const startIso = comp?.date || event?.date || "";
  const competitors = comp?.competitors || [];
  const away = competitors.find((c) => c.homeAway === "away") || {};
  const home = competitors.find((c) => c.homeAway === "home") || {};

  const mkTeam = (side) => ({
    id: side?.team?.id,
    abbr:
      side?.team?.abbreviation ??
      side?.team?.shortDisplayName ??
      side?.team?.name ??
      "",
    score: side?.score ?? "",
    rank: side?.curatedRank?.current ?? side?.rank ?? null,
    logo: side?.team?.logo,
  });

  const kickoffText = fmtKickoff(startIso);

  return {
    id: event?.id,
    bowl: getBowlName(comp),
    network: getNetwork(comp),
    state, // "in" | "post" | "pre"
    statusText: status || kickoffText,
    isFinal: (status || "").toLowerCase().startsWith("final"),
    startTimeText: kickoffText,
    home: mkTeam(home),
    away: mkTeam(away),
  };
};

const GamesBanner = ({
  pollMs = 60_000,
  hideOnSmall = true,
  header = "Bowl Games",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const mounted = useRef(true);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchNcaafScoreboard();
      if (!mounted.current) return;
      setData(response);
    } catch (e) {
      if (!mounted.current) return;
      setError(e?.message || "Failed to fetch NCAAF data");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [pollMs]);

  const games = useMemo(() => {
    const events = data?.events || [];
    return events
      .map(formatGame)
      .sort((a, b) => {
        const liveA = a.state === "in";
        const liveB = b.state === "in";
        if (liveA !== liveB) return Number(liveB) - Number(liveA);
        if (a.isFinal !== b.isFinal)
          return Number(b.isFinal) - Number(a.isFinal);
        return 0;
      })
      .slice(0, 20);
  }, [data]);

  console.log(games)

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
