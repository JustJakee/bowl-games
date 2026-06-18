import { Box, Skeleton, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { useScoreboard } from "../../context/NCAAFDataContext";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";
import TeamLogo from "../common/TeamLogo";
import EmptyState from "../common/EmptyState";

const sortGames = (games) => {
  return games.slice().sort((a, b) => {
    const aDate = a?.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b?.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
};

const UpcomingBowlsCard = () => {
  const { games, loading, error } = useScoreboard();
  const theme = useTheme();
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const upcomingGames = sortGames(
    (games || []).filter((game) => game?.state !== "post" && game?.isFinal !== true)
  ).slice(0, 4);

  return (
    <Panel sx={{ height: "100%" }}>
      <Stack spacing={1.5}>
        <SectionHeader title="Upcoming Bowls" actionLabel="View Full Schedule" actionTo="/schedule" />
        {loading ? (
          <Stack spacing={1.5}>
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} variant="rounded" height={74} />
            ))}
          </Stack>
        ) : null}
        {!loading && error ? (
          <EmptyState title="Unable to load bowls" description={error} />
        ) : null}
        {!loading && !error && upcomingGames.length === 0 ? (
          <EmptyState
            title="No upcoming bowls"
            description="Check back once the scoreboard feed posts future matchups."
          />
        ) : null}
        {!loading && !error
          ? upcomingGames.map((game) => (
              <Box
                key={game.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: isLargeDesktop
                    ? "70px 100px minmax(180px, 1fr) minmax(90px, auto) minmax(150px, auto) 32px minmax(150px, auto)"
                    : "1fr auto",
                  gap: isLargeDesktop ? 1 : 1.5,
                  alignItems: "center",
                  py: isLargeDesktop ? 1 : 1.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-of-type": { borderBottom: "none", pb: 0 },
                }}
              >
                {isLargeDesktop ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                      {game.startDateText || "Date TBD"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                      {game.startTimeText || game.statusText}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontSize: "0.95rem" }}>
                      {game.bowl}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                      {game.network || "TBD"}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TeamLogo
                        src={game.away?.logo}
                        alt={`${game.away?.displayName || game.away?.abbr || "Away team"} logo`}
                        abbr={game.away?.abbr}
                        size={26}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {game.away?.abbr || "TBD"}
                      </Typography>
                    </Stack>
                    <Typography variant="overline" color="text.secondary" sx={{ textAlign: "center" }}>
                      VS
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TeamLogo
                        src={game.home?.logo}
                        alt={`${game.home?.displayName || game.home?.abbr || "Home team"} logo`}
                        abbr={game.home?.abbr}
                        size={26}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {game.home?.abbr || "TBD"}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">{game.bowl}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`${game.startDateText || "Date TBD"} ${game.startTimeText || game.statusText} ${game.network || "TBD"}`}
                      </Typography>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TeamLogo
                            src={game.away?.logo}
                            alt={`${game.away?.displayName || game.away?.abbr || "Away team"} logo`}
                            abbr={game.away?.abbr}
                            size={28}
                          />
                          <Typography variant="body2">{game.away?.abbr || "TBD"}</Typography>
                        </Stack>
                        <Typography variant="overline" color="text.secondary">
                          VS
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TeamLogo
                            src={game.home?.logo}
                            alt={`${game.home?.displayName || game.home?.abbr || "Home team"} logo`}
                            abbr={game.home?.abbr}
                            size={28}
                          />
                          <Typography variant="body2">{game.home?.abbr || "TBD"}</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                    <Typography
                      component={RouterLink}
                      to="/schedule"
                      variant="body2"
                      sx={{ textDecoration: "none", fontWeight: 700 }}
                    >
                      View
                    </Typography>
                  </>
                )}
              </Box>
            ))
          : null}
      </Stack>
    </Panel>
  );
};

export default UpcomingBowlsCard;
