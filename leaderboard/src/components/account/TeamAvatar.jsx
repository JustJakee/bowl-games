import { useEffect, useState } from "react";
import { Avatar, Box } from "@mui/material";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";

const TeamAvatar = ({
  team,
  size = 40,
  fallbackIcon = <SportsFootballRoundedIcon fontSize="small" />,
}) => {
  const [failed, setFailed] = useState(false);
  const logo = team?.logo || "";

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  if (logo && !failed) {
    return (
      <Box
        component="img"
        src={logo}
        alt={`${team.displayName} logo`}
        onError={() => setFailed(true)}
        sx={{
          display: "block",
          width: size,
          height: size,
          flex: "0 0 auto",
          objectFit: "contain",
          bgcolor: "transparent",
        }}
      />
    );
  }

  return (
    <Avatar
      aria-label={
        team?.displayName ? `${team.displayName} logo unavailable` : undefined
      }
      sx={{
        width: size,
        height: size,
        flex: "0 0 auto",
        bgcolor: "rgba(255,255,255,0.08)",
        color: "text.secondary",
      }}
    >
      {fallbackIcon}
    </Avatar>
  );
};

export default TeamAvatar;
