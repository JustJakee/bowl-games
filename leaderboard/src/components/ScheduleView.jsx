// UI - SCHEDULE - REACT
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import TeamLogo from "./common/TeamLogo";
import { useScoreboard } from "../context/NCAAFDataContext";
import { useGamePickSplitViews } from "../hooks/useGamePickSplitViews";
import { getGamePickActionState } from "../utils/gamePickSplits";
import "../styles/schedule-view.css";

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DESKTOP_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const MOBILE_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

const getGameTime = (game) => {
  const time = game?.startDate ? new Date(game.startDate).getTime() : NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};

const getDateKey = (game) => {
  if (!game?.startDate) return "date-tbd";
  return DATE_KEY_FORMATTER.format(new Date(game.startDate));
};

const getDateLabel = (game, mobile = false) => {
  if (!game?.startDate) return "Date TBD";
  const formatter = mobile ? MOBILE_DATE_FORMATTER : DESKTOP_DATE_FORMATTER;
  return formatter.format(new Date(game.startDate)).toUpperCase();
};

const groupGamesByDate = (games) => {
  const groups = new Map();

  games
    .filter(Boolean)
    .slice()
    .sort((left, right) => getGameTime(left) - getGameTime(right))
    .forEach((game) => {
      const key = getDateKey(game);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          sortTime: getGameTime(game),
          desktopLabel: getDateLabel(game),
          mobileLabel: getDateLabel(game, true),
          games: [],
        });
      }

      groups.get(key).games.push(game);
    });

  return Array.from(groups.values()).sort(
    (left, right) => left.sortTime - right.sortTime,
  );
};

const getStatusKind = (game) => {
  if (game?.state === "in") return "live";
  const status = String(game?.statusText || "").toLowerCase();
  if (status.includes("cancel")) return "canceled";
  if (status.includes("postpon")) return "postponed";
  if (game?.isFinal || game?.state === "post") return "final";
  return "scheduled";
};

const getStatusLabel = (game) => {
  const statusKind = getStatusKind(game);
  if (statusKind === "live") return "LIVE";
  if (statusKind === "final") return "FINAL";
  if (statusKind === "canceled") return "CANCELED";
  if (statusKind === "postponed") return "POSTPONED";
  return "";
};

const getMetaTime = (game) => {
  const statusKind = getStatusKind(game);
  if (statusKind === "live") return game?.statusText || "Live";
  if (statusKind === "scheduled") return game?.startTimeText || "Time TBD";
  return game?.statusText || "Final";
};

const getVenueText = (game) => {
  if (game?.location) return game.location.replaceAll(" | ", ", ");
  return game?.venueName || "";
};

const GameStatusBadge = ({ game }) => {
  const label = getStatusLabel(game);
  if (!label) return null;

  return (
    <span className={`schedule-status schedule-status--${getStatusKind(game)}`}>
      {label}
    </span>
  );
};

const ScheduleNetworkMeta = ({ network }) => (
  <span className="schedule-network-meta">
    <TvRoundedIcon aria-hidden="true" />
    <span>{network || "Network TBD"}</span>
  </span>
);

const PickSplitTeamRow = ({ team, revealed }) => {
  return (
    <div className="schedule-pick-team">
      <div className="schedule-pick-team-header">
        <span className="schedule-pick-team-name">{team.name}</span>
        {revealed ? (
          <span className="schedule-pick-count">
            {team.count} {team.count === 1 ? "pick" : "picks"} ·{" "}
            {team.percentage}%
          </span>
        ) : null}
      </div>
      {revealed ? (
        <div className="schedule-pick-bar" aria-hidden="true">
          <span style={{ width: `${team.percentage}%` }} />
        </div>
      ) : null}
    </div>
  );
};

const OwnedEntryPicks = ({ picks }) => {
  return (
    <div className="schedule-owned-picks">
      <div className="schedule-pick-split-title">Your Picks</div>
      {picks.length === 0 ? (
        <p className="schedule-pick-hidden-copy">
          No picks saved for your entries.
        </p>
      ) : (
        <div className="schedule-owned-pick-list">
          {picks.map((pick) => (
            <div key={pick.entryId} className="schedule-owned-pick-row">
              <span className="schedule-owned-entry-name">{pick.entryName}</span>
              <span className="schedule-owned-team-name">
                {pick.selectedTeamName || pick.selectedTeam}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ScheduleCardPickSplit = ({ game, pickSplit, loading, error }) => {
  if (loading && !pickSplit) {
    return (
      <div className="schedule-pick-split schedule-pick-split--loading">
        Loading pick breakdown...
      </div>
    );
  }

  if (error && !pickSplit) {
    return (
      <div className="schedule-pick-split schedule-pick-split--error">
        Pick breakdown unavailable.
      </div>
    );
  }

  if (!pickSplit) {
    return null;
  }

  const actionState = getGamePickActionState(pickSplit);
  const action = actionState.enabled ? (
    <RouterLink className="schedule-pick-link" to={`/schedule/${game.id}`}>
      {actionState.label}
    </RouterLink>
  ) : (
    <button
      type="button"
      className="schedule-pick-link schedule-pick-link--disabled"
      disabled
      aria-disabled="true"
    >
      {actionState.label}
    </button>
  );

  if (!pickSplit.isLocked) {
    return (
      <div className="schedule-pick-split">
        <OwnedEntryPicks picks={pickSplit.ownedPicks} />
        {action}
      </div>
    );
  }

  return (
    <div className="schedule-pick-split">
      <div className="schedule-pick-split-title">Pick Split</div>
      <div className="schedule-pick-teams">
        {pickSplit.teamSplits.map((team) => (
          <PickSplitTeamRow key={team.key || team.side} team={team} revealed />
        ))}
      </div>
      <OwnedEntryPicks picks={pickSplit.ownedPicks} />
      {action}
    </div>
  );
};

const TeamRow = ({ game, side }) => {
  const team = game?.[side] || {};
  const teamName = team.displayName || team.abbr || "TBD";

  return (
    <div className="schedule-team-row">
      <div className="schedule-team-main">
        <TeamLogo
          src={team.logo}
          alt={`${teamName} logo`}
          abbr={team.abbr}
          size={34}
        />
        <span className="schedule-team-name">{teamName}</span>
      </div>
    </div>
  );
};

const ScheduleCard = ({ game, pickSplit, pickLoading, pickError }) => {
  const statusKind = getStatusKind(game);
  const network = game?.network || "Network TBD";
  const venue = getVenueText(game);

  return (
    <article className={`schedule-card schedule-card--${statusKind}`}>
      <header className="schedule-card-header">
        <div className="schedule-card-title-wrap">
          <h3 className="schedule-card-title">{game?.bowl || "Bowl Game"}</h3>
          {venue ? (
            <div className="schedule-card-venue">
              <PlaceRoundedIcon aria-hidden="true" />
              <span>{venue}</span>
            </div>
          ) : null}
        </div>
        <div className="schedule-card-badges">
          <GameStatusBadge game={game} />
        </div>
      </header>

      <div className="schedule-team-list">
        <TeamRow game={game} side="away" />
        <TeamRow game={game} side="home" />
      </div>

      <footer className="schedule-card-meta">
        <ScheduleNetworkMeta network={network} />
        <span className={`schedule-card-time schedule-card-time--${statusKind}`}>
          {getMetaTime(game)}
        </span>
      </footer>

      <ScheduleCardPickSplit
        game={game}
        pickSplit={pickSplit}
        loading={pickLoading}
        error={pickError}
      />
    </article>
  );
};

const ScheduleDateSection = ({ group, mobile, pickSplits, pickLoading, pickError }) => {
  const gameCount = group.games.length;
  const headingId = `schedule-date-${group.key.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <section className="schedule-date-section" aria-labelledby={headingId}>
      <div className="schedule-date-header">
        <h2 id={headingId} className="schedule-date-title">
          {mobile ? group.mobileLabel : group.desktopLabel}
        </h2>
        <span className="schedule-date-count">
          {gameCount} {gameCount === 1 ? "Game" : "Games"}
        </span>
      </div>
      <div className="schedule-date-grid">
        {group.games.map((game, index) => (
          <ScheduleCard
            key={game?.id || `${group.key}-${index}`}
            game={game}
            pickSplit={pickSplits[game?.id]}
            pickLoading={pickLoading}
            pickError={pickError}
          />
        ))}
      </div>
    </section>
  );
};

const ScheduleView = () => {
  const { games: scoreboardGames, loading, error } = useScoreboard();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const groupedGames = groupGamesByDate(scoreboardGames);
  const {
    viewsByGameId: pickSplits,
    loading: pickSplitsLoading,
    error: pickSplitsError,
  } = useGamePickSplitViews(scoreboardGames);

  if (loading) {
    return (
      <div className="schedule-page schedule-page--state">Loading games...</div>
    );
  }

  if (error) {
    return (
      <div
        className="schedule-page schedule-page--state schedule-page--error"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <Box className="schedule-page">
      <Stack
        className="schedule-page-header"
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography component="h1" className="schedule-page-title">
            2026-27 Bowl Games
          </Typography>
          <Typography className="schedule-page-subtitle">
            Comprehensive list of all upcoming NCAA bowl games, live scores, TV
            listings, and kickoff times.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/entries"
          variant="contained"
          startIcon={<ListAltRoundedIcon />}
          className="schedule-picks-button"
          sx={{
            boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.18)}`,
          }}
        >
          My Entries
        </Button>
      </Stack>

      {groupedGames.length === 0 ? (
        <div className="schedule-empty-state">No games scheduled right now.</div>
      ) : (
        <div className="schedule-sections">
          {groupedGames.map((group) => (
            <ScheduleDateSection
              key={group.key}
              group={group}
              mobile={isMobile}
              pickSplits={pickSplits}
              pickLoading={pickSplitsLoading}
              pickError={pickSplitsError}
            />
          ))}
        </div>
      )}
    </Box>
  );
};

export default ScheduleView;
