import { Typography, TextField } from "@mui/material";
import VersusBadge from "./VersusBadge";
import TeamPickOption from "./TeamPickOption";

const PickMatchupCard = ({
  id,
  bowlName,
  tieBreaker,
  setTieBreaker,
  network,
  statusText,
  isLive,
  awayTeam,
  homeTeam,
  selection,
  onSelect,
}) => {
  const selectTeam = (teamCode) => {
    onSelect?.(id, teamCode); // sends game id back to pickForm can be changed to bowl game name later
  };

  const isTieBreaker = bowlName === "Scooter's Coffee Frisco Bowl"; // This will be whatever Bowl is the tie breaker

  return (
    <article className="pick-card" data-live={isLive ? "true" : undefined}>
      <header className="pick-card-header">
        {bowlName && (
          <Typography variant="subtitle1" fontWeight={700}>
            {bowlName}
          </Typography>
        )}
      </header>

      <div className="pick-card-body">
        <TeamPickOption
          side="away"
          accentColor={awayTeam?.color}
          code={awayTeam?.code}
          nickname={awayTeam?.nickname}
          record={awayTeam?.record}
          logoUrl={awayTeam?.logoUrl}
          isSelected={selection === awayTeam?.code}
          onSelect={selectTeam}
        />
        <VersusBadge />
        <TeamPickOption
          side="home"
          accentColor={homeTeam?.color}
          code={homeTeam?.code}
          nickname={homeTeam?.nickname}
          record={homeTeam?.record}
          logoUrl={homeTeam?.logoUrl}
          isSelected={selection === homeTeam?.code}
          onSelect={selectTeam}
        />
        {isTieBreaker && (
          <div className="pick-card-tiebreaker">
            <TextField
              label="Total Points"
              placeholder="Total points"
              value={tieBreaker ?? 0}
              type="number"
              size="small"
              fullWidth
              inputProps={{ min: 0, inputMode: "numeric", pattern: "[0-9]*" }}
              onChange={(event) => setTieBreaker?.(event.target.value)}
            />
          </div>
        )}
      </div>

      <footer className="pick-card-footer">
        <div className="pick-card-status">
          {statusText && (
            <Typography
              variant="caption"
              component="span"
              className="pick-card-status-text"
            >
              {statusText}
            </Typography>
          )}
          {network && (
            <Typography variant="caption" component="span">
              {network}
            </Typography>
          )}
        </div>
      </footer>
    </article>
  );
};

export default PickMatchupCard;
