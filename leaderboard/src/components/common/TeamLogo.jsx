import { useState } from "react";
import { Box } from "@mui/material";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";

const TeamLogo = ({ src, alt, abbr, size = 34, sx = {} }) => {
  const [failed, setFailed] = useState(false);
  const fallback = !src || failed;

  if (!fallback) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        sx={{
          display: "block",
          width: size,
          height: size,
          objectFit: "contain",
          flexShrink: 0,
          bgcolor: "transparent",
          ...sx,
          borderRadius: 0,
          overflow: "visible",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        bgcolor: "rgba(255,255,255,0.08)",
        color: "text.secondary",
        fontSize: Math.max(12, size * 0.34),
        fontWeight: 800,
        ...sx,
      }}
    >
      {abbr?.slice(0, 2) || <SportsFootballRoundedIcon fontSize="small" />}
    </Box>
  );
};

export default TeamLogo;
