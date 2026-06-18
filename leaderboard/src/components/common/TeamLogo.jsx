import { useState } from "react";
import { Avatar } from "@mui/material";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";

const TeamLogo = ({ src, alt, abbr, size = 34, sx = {} }) => {
  const [failed, setFailed] = useState(false);
  const fallback = !src || failed;

  return (
    <Avatar
      src={fallback ? undefined : src}
      alt={alt}
      imgProps={{
        loading: "lazy",
        onError: () => setFailed(true),
      }}
      sx={{
        width: size,
        height: size,
        bgcolor: "rgba(255,255,255,0.08)",
        color: "text.secondary",
        fontSize: Math.max(12, size * 0.34),
        ...sx,
      }}
    >
      {fallback ? abbr?.slice(0, 2) || <SportsFootballRoundedIcon fontSize="small" /> : null}
    </Avatar>
  );
};

export default TeamLogo;
