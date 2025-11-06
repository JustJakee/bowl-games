import { Avatar, Typography } from "@mui/material";

const TeamPickOption = ({
  side = "away",
  code,
  record,
  logoUrl,
  isSelected = false,
  disabled = false,
  accentColor,
  onSelect,
}) => {
  const handleClick = () => {
    if (disabled) return;
    onSelect?.(code);
  };

  const classes = ["team-pick-option", `team-${side}`];
  if (isSelected) classes.push("selected");

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={classes.join(" ")}
      style={
        accentColor
          ? {
              ["--team-accent"]: accentColor,
            }
          : undefined
      }
    >
      <div className="team-pick-meta">
        <Typography
          variant="h6"
          component="span"
          fontWeight={700}
          className="team-pick-code"
        >
          {code}{" "}
          {record <= 25 && (
            <Typography
              variant="caption"
              component="span"
              className="team-pick-record"
            >
              {record}
            </Typography>
          )}
        </Typography>
      </div>
      {logoUrl && (
        <Avatar
          src={logoUrl}
          alt={`${code} logo`}
          className="team-pick-logo"
          imgProps={{ loading: "lazy" }}
        />
      )}
    </button>
  );
};

export default TeamPickOption;

