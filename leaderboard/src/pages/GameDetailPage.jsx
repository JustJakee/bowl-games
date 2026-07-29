// UI - SCHEDULE GAME DETAIL - REACT
import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, Divider, Stack } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import { useScoreboard } from "../context/NCAAFDataContext";
import { useGamePickSplitViews } from "../hooks/useGamePickSplitViews";
import "../styles/game-detail.css";

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
  return "SCHEDULED";
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

const DetailStatusBadge = ({ game }) => (
  <span
    className={`game-detail-status game-detail-status--${getStatusKind(game)}`}
  >
    {getStatusLabel(game)}
  </span>
);

const GameMetaRow = ({ icon, label }) => {
  if (!label) return null;

  return (
    <div className="game-detail-meta-row">
      {icon}
      <span>{label}</span>
    </div>
  );
};

const DetailTeamLogo = ({ team, name }) => {
  const [failed, setFailed] = useState(false);

  if (!team?.logo || failed) {
    return (
      <div className="game-detail-logo-fallback" aria-label={`${name} logo`}>
        {team?.abbr || <SportsFootballRoundedIcon fontSize="small" />}
      </div>
    );
  }

  return (
    <img
      className="game-detail-logo"
      src={team.logo}
      alt={`${name} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const DetailTeam = ({ team, score, showScore }) => {
  const name = team?.displayName || team?.abbr || "TBD";

  return (
    <div className="game-detail-team">
      <DetailTeamLogo team={team} name={name} />
      <div>
        <div className="game-detail-team-name">{name}</div>
        {team?.abbr ? (
          <div className="game-detail-team-abbr">{team.abbr}</div>
        ) : null}
      </div>
      {showScore ? (
        <div className="game-detail-score">{score || "--"}</div>
      ) : null}
    </div>
  );
};

const YourPicksPanel = ({ pickSplit, unavailable }) => {
  if (unavailable) {
    return (
      <section className="game-detail-panel game-detail-your-picks">
        <h2>Your Picks</h2>
        <p className="game-detail-muted">Your picks are unavailable.</p>
      </section>
    );
  }

  if (!pickSplit) {
    return (
      <section className="game-detail-panel game-detail-your-picks">
        <h2>Your Picks</h2>
        <p className="game-detail-muted">Loading your picks...</p>
      </section>
    );
  }

  return (
    <section className="game-detail-panel game-detail-your-picks">
      <h2>Your Picks</h2>
      {pickSplit.ownedPicks.length === 0 ? (
        <p className="game-detail-muted">No pick saved for your entries.</p>
      ) : (
        <div className="game-detail-owned-list">
          {pickSplit.ownedPicks.map((pick) => (
            <div key={pick.entryId} className="game-detail-owned-pick">
              <div className="game-detail-owned-team">
                {pick.selectedTeamLogo ? (
                  <img
                    src={pick.selectedTeamLogo}
                    alt=""
                    loading="lazy"
                    className="game-detail-owned-logo"
                  />
                ) : null}
                <span>{pick.selectedTeamName || pick.selectedTeam}</span>
              </div>
              <span className="game-detail-owned-entry">{pick.entryName}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const TeamPickGroup = ({ team }) => (
  <div className="game-detail-team-group">
    <div className="game-detail-team-group-heading">
      <div className="game-detail-team-group-title">
        {team.logo ? <img src={team.logo} alt="" loading="lazy" /> : null}
        <h3>{team.name}</h3>
      </div>
      <strong>
        {team.count} {team.count === 1 ? "pick" : "picks"} · {team.percentage}%
      </strong>
    </div>
    <div className="game-detail-split-bar" aria-hidden="true">
      <span style={{ width: `${team.percentage}%` }} />
    </div>
    <div className="game-detail-entry-list">
      {team.entries.length === 0 ? (
        <p className="game-detail-muted">No entries picked this team.</p>
      ) : (
        team.entries.map((entryPick) => (
          <div key={entryPick.entryId} className="game-detail-entry-row">
            <span>{entryPick.entryName}</span>
            {entryPick.isOwned ? (
              <strong className="game-detail-entry-badge">Your Entry</strong>
            ) : null}
          </div>
        ))
      )}
    </div>
  </div>
);

const AllPicksPanel = ({ pickSplit }) => {
  if (!pickSplit) {
    return (
      <section className="game-detail-panel game-detail-all-picks">
        <h2>All Picks</h2>
        <p className="game-detail-muted">Loading all picks...</p>
      </section>
    );
  }

  if (!pickSplit.isLocked) {
    return (
      <section className="game-detail-panel game-detail-all-picks">
        <h2>All Picks</h2>
        <p className="game-detail-lock-message">
          Everyone else's picks unlock at kickoff.
        </p>
      </section>
    );
  }

  return (
    <section className="game-detail-panel game-detail-all-picks">
      <h2>All Picks</h2>
      <div className="game-detail-all-picks-grid">
        {pickSplit.teamSplits.map((team) => (
          <TeamPickGroup key={team.key || team.side} team={team} />
        ))}
      </div>
      {pickSplit.hasInvalidRevealedPicks ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Some historical picks did not match either team and were excluded.
        </Alert>
      ) : null}
    </section>
  );
};

const GameDetailPage = () => {
  const { gameId } = useParams();
  const { games, loading, error } = useScoreboard();
  const game = games.find((candidate) => candidate.id === gameId) || null;
  const {
    viewsByGameId,
    error: picksError,
  } = useGamePickSplitViews(game ? [game] : []);
  const pickSplit = game ? viewsByGameId[game.id] : null;
  const showScore = game?.state === "in" || game?.state === "post" || game?.isFinal;

  if (loading) {
    return <div className="game-detail-page">Loading game...</div>;
  }

  if (error) {
    return (
      <div className="game-detail-page">
        <Alert severity="error">Unable to load games.</Alert>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-detail-page">
        <Button
          component={RouterLink}
          to="/schedule"
          startIcon={<ArrowBackRoundedIcon />}
        >
          Back to Games
        </Button>
        <section className="game-detail-panel">
          <h1>Game not found</h1>
          <p className="game-detail-muted">
            The requested game could not be found.
          </p>
        </section>
      </div>
    );
  }

  return (
    <Box className="game-detail-page">
      <Button
        component={RouterLink}
        to="/schedule"
        startIcon={<ArrowBackRoundedIcon />}
        className="game-detail-back"
        aria-label="Back to Games"
      >
        Back to Games
      </Button>

      <div className="game-detail-layout">
        <main className="game-detail-main">
          <section className="game-detail-hero">
            <div className="game-detail-title-row">
              <div>
                <h1>{game.bowl || "Bowl Game"}</h1>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <GameMetaRow label={formatDate(game.startDate)} />
                  <GameMetaRow label={getMetaTime(game)} />
                  <GameMetaRow
                    icon={<TvRoundedIcon aria-hidden="true" />}
                    label={game.network || "Network TBD"}
                  />
                  <GameMetaRow
                    icon={<PlaceRoundedIcon aria-hidden="true" />}
                    label={getVenueText(game)}
                  />
                </Stack>
              </div>
              <DetailStatusBadge game={game} />
            </div>

            <Divider className="game-detail-divider" />

            <div className="game-detail-matchup">
              <DetailTeam
                team={game.away}
                score={game.away?.score}
                showScore={showScore}
              />
              <div className="game-detail-vs">{showScore ? getMetaTime(game) : "VS"}</div>
              <DetailTeam
                team={game.home}
                score={game.home?.score}
                showScore={showScore}
              />
            </div>
          </section>

          <AllPicksPanel pickSplit={pickSplit} />
        </main>

        <aside className="game-detail-sidebar">
          <YourPicksPanel pickSplit={pickSplit} unavailable={Boolean(picksError)} />
        </aside>
      </div>
    </Box>
  );
};

export default GameDetailPage;
