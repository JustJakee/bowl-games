import { Box, Stack, Typography } from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";

const footballSpriteUrl = new URL(
  "../../assets/football-rotation-sprites.png",
  import.meta.url,
).href;

if (typeof window !== "undefined") {
  const preloadedFootball = new window.Image();
  preloadedFootball.src = footballSpriteUrl;
}

// Each position centers the measured alpha bounds for one frame in a 90x136
// viewport. The source frames have intentionally uneven widths and spacing.
const footballSpin = keyframes`
  0%, 100% { background-position: -7.1px -51.8px; }
  12.5% { background-position: -97px -51.6px; }
  25% { background-position: -184.5px -51.6px; }
  37.5% { background-position: -273px -51.8px; }
  50% { background-position: -361.4px -51.8px; }
  62.5% { background-position: -450.5px -51.6px; }
  75% { background-position: -538.1px -51.5px; }
  87.5% { background-position: -626.2px -51.5px; }
`;

const PickActionOverlay = ({ open, statusText }) => {
  if (!open) return null;

  return (
    <Box
      data-testid="pick-action-overlay"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      sx={{
        position: "absolute",
        top: { xs: 62, md: 68 },
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        px: 2,
        pt: { xs: 4, sm: 5, md: 6 },
        borderRadius: { xs: 2, md: 3 },
        background: (theme) =>
          `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.72)} 0%, ${alpha("#071a38", 0.8)} 100%)`,
        backdropFilter: "blur(1.5px) saturate(76%)",
      }}
    >
      <Stack
        spacing={1.5}
        alignItems="center"
        sx={{
          position: "sticky",
          top: { xs: 78, md: 96 },
          width: "min(100%, 300px)",
          maxWidth: 300,
          px: { xs: 2.5, sm: 3 },
          py: { xs: 2.25, sm: 2.5 },
          color: "common.white",
          textAlign: "center",
          border: "1px solid",
          borderColor: (theme) => alpha(theme.palette.divider, 0.92),
          borderRadius: (theme) => theme.customShape?.panelRadius ?? 3,
          backgroundColor: alpha("#122440", 0.97),
          boxShadow: `0 16px 38px ${alpha("#000", 0.32)}`,
        }}
      >
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: { xs: 82, sm: 90 },
            height: { xs: 124, sm: 136 },
            transform: "rotate(18deg)",
          }}
        >
          <Box
            data-testid="rotating-football"
            aria-hidden="true"
            sx={{
              width: 90,
              height: 136,
              flexShrink: 0,
              backgroundImage: `url(${footballSpriteUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "718.7px 239.6px",
              backgroundPosition: "-7.1px -51.8px",
              transformOrigin: "50% 50%",
              transform: { xs: "scale(0.9111)", sm: "scale(1)" },
              willChange: "background-position",
              filter: `drop-shadow(0 9px 12px ${alpha("#000", 0.28)})`,
              animation: `${footballSpin} 1s steps(1, end) infinite`,
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
                backgroundPosition: "-7.1px -51.8px",
              },
            }}
          />
        </Box>

        <Typography
          variant="body2"
          component="p"
          sx={{
            color: "common.white",
            fontWeight: 700,
            letterSpacing: "0.025em",
          }}
        >
          {statusText}
        </Typography>
      </Stack>
    </Box>
  );
};

export default PickActionOverlay;
