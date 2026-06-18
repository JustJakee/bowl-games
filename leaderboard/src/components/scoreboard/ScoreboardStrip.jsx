import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SportsFootballRoundedIcon from "@mui/icons-material/SportsFootballRounded";
import { alpha, useTheme } from "@mui/material/styles";
import { useScoreboard } from "../../context/NCAAFDataContext";
import ScoreboardGameCard from "./ScoreboardGameCard";

const ARROW_WIDTH = 44;
const SCROLL_TOLERANCE = 2;

const ScoreboardStrip = () => {
  const { games, loading, error } = useScoreboard();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const viewportRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useMemo(
    () => () => {
      const container = viewportRef.current;

      if (!container || !isDesktop) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }

      const nextCanScrollLeft = container.scrollLeft > SCROLL_TOLERANCE;
      const nextCanScrollRight =
        container.scrollLeft + container.clientWidth <
        container.scrollWidth - SCROLL_TOLERANCE;

      setCanScrollLeft(nextCanScrollLeft);
      setCanScrollRight(nextCanScrollRight);
    },
    [isDesktop]
  );

  useEffect(() => {
    const container = viewportRef.current;

    if (!container) {
      return undefined;
    }

    updateScrollState();

    const handleScroll = () => {
      updateScrollState();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateScrollState();
          })
        : null;

    resizeObserver?.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [games, isDesktop, loading, updateScrollState]);

  const scrollScoreboard = (direction) => {
    const container = viewportRef.current;

    if (!container) {
      return;
    }

    const distance = container.clientWidth * 0.75;

    container.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  };

  const arrowButtonSx = (direction) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [direction]: 0,
    width: ARROW_WIDTH,
    display: { xs: "none", lg: "flex" },
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    borderRadius: 0,
    color: "text.primary",
    borderLeft:
      direction === "right" ? `1px solid ${theme.palette.divider}` : "none",
    borderRight:
      direction === "left" ? `1px solid ${theme.palette.divider}` : "none",
    background:
      direction === "right"
        ? `linear-gradient(to left, ${alpha(theme.palette.background.default, 0.98)} 45%, ${alpha(theme.palette.background.default, 0)})`
        : `linear-gradient(to right, ${alpha(theme.palette.background.default, 0.98)} 45%, ${alpha(theme.palette.background.default, 0)})`,
    "&:hover": {
      color: "primary.main",
      background:
        direction === "right"
          ? `linear-gradient(to left, ${alpha(theme.palette.background.paper, 1)} 52%, ${alpha(theme.palette.background.paper, 0)})`
          : `linear-gradient(to right, ${alpha(theme.palette.background.paper, 1)} 52%, ${alpha(theme.palette.background.paper, 0)})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  });

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
      <Box sx={{ position: "relative", px: { xs: 2, md: 3 }, pb: 1.5 }}>
        <Box
          ref={viewportRef}
          tabIndex={0}
          sx={{
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            pl: { lg: canScrollLeft ? `${ARROW_WIDTH}px` : 0 },
            pr: { lg: canScrollRight ? `${ARROW_WIDTH}px` : 0 },
            transition: "padding 120ms ease",
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
                    sx={{ borderRadius: (currentTheme) => currentTheme.customShape?.scoreboardRadius ?? 3 }}
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

        {isDesktop && canScrollLeft ? (
          <IconButton
            aria-label="Scroll scoreboard left"
            onClick={() => scrollScoreboard("left")}
            sx={arrowButtonSx("left")}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
        ) : null}

        {isDesktop && canScrollRight ? (
          <IconButton
            aria-label="Scroll scoreboard right"
            onClick={() => scrollScoreboard("right")}
            sx={arrowButtonSx("right")}
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        ) : null}
      </Box>
    </Box>
  );
};

export default ScoreboardStrip;
