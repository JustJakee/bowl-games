import { Box, Skeleton, Stack, Typography } from "@mui/material";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import { useScoreboard } from "../../context/NCAAFDataContext";
import ScoreboardGameCard from "./ScoreboardGameCard";

const ScoreboardStrip = () => {
  const { games, loading, error } = useScoreboard();

  return (
    <Box
      component="section"
      aria-label="Global scoreboard"
      sx={{
        width: "100%",
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "rgba(3, 9, 18, 0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: { xs: 2, md: 3 }, py: 1.5 }}>
        <SportsFootballRoundedIcon sx={{ color: "primary.main" }} />
        <Typography variant="overline" color="text.secondary">
          Scoreboard
        </Typography>
      </Stack>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          pb: 1.5,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ minWidth: "max-content" }}>
          {loading
            ? [0, 1, 2, 3].map((item) => (
                <Skeleton
                  key={item}
                  variant="rounded"
                  width={220}
                  height={126}
                  sx={{ borderRadius: (theme) => theme.customShape?.scoreboardRadius ?? 3 }}
                />
              ))
            : null}
          {!loading && error ? (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          ) : null}
          {!loading && !error && games.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bowl games available right now.
            </Typography>
          ) : null}
          {!loading && !error ? games.map((game) => <ScoreboardGameCard key={game.id} game={game} />) : null}
        </Stack>
      </Box>
    </Box>
  );
};

export default ScoreboardStrip;
