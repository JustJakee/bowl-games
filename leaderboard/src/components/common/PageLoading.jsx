import { useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

export const DEFAULT_LOADING_DELAY_MS = 200;
export const DEFAULT_SLOW_AFTER_MS = 3000;
export const DEFAULT_SLOW_MESSAGE =
  "Still loading. This is taking longer than expected.";

const normalizeDelay = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const schedulePageLoadingTimers = ({
  delayMs = DEFAULT_LOADING_DELAY_MS,
  onShow,
  onSlow,
  slowAfterMs = DEFAULT_SLOW_AFTER_MS,
  clearTimer = clearTimeout,
  setTimer = setTimeout,
}) => {
  let active = true;
  const showAfter = normalizeDelay(delayMs, DEFAULT_LOADING_DELAY_MS);
  const slowAfter = normalizeDelay(slowAfterMs, DEFAULT_SLOW_AFTER_MS);

  const showTimer = setTimer(() => {
    if (active) onShow();
  }, showAfter);
  const slowTimer = setTimer(() => {
    if (!active) return;
    onShow();
    onSlow();
  }, slowAfter);

  return () => {
    active = false;
    clearTimer(showTimer);
    clearTimer(slowTimer);
  };
};

export const PageLoadingView = ({
  message = "Loading...",
  showSlowMessage = false,
  slowMessage = DEFAULT_SLOW_MESSAGE,
}) => (
  <Box
    role="status"
    aria-live="polite"
    aria-busy="true"
    sx={{
      minHeight: { xs: 240, sm: 320 },
      width: "100%",
      minWidth: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: { xs: 2, sm: 3 },
      py: 4,
      overflow: "hidden",
    }}
  >
    <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 420 }}>
      <CircularProgress
        color="primary"
        size={38}
        thickness={4.5}
        aria-hidden="true"
        sx={{ color: "primary.main" }}
      />
      <Typography variant="body1" align="center" sx={{ fontWeight: 700 }}>
        {message}
      </Typography>
      {showSlowMessage ? (
        <Typography variant="body2" color="text.secondary" align="center">
          {slowMessage}
        </Typography>
      ) : null}
    </Stack>
  </Box>
);

const PageLoading = ({
  delayMs = DEFAULT_LOADING_DELAY_MS,
  loading,
  message = "Loading...",
  slowAfterMs = DEFAULT_SLOW_AFTER_MS,
  slowMessage = DEFAULT_SLOW_MESSAGE,
}) => {
  const [visible, setVisible] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    setVisible(false);
    setShowSlowMessage(false);
    if (!loading) return undefined;

    return schedulePageLoadingTimers({
      delayMs,
      slowAfterMs,
      onShow: () => setVisible(true),
      onSlow: () => setShowSlowMessage(true),
    });
  }, [delayMs, loading, slowAfterMs]);

  if (!loading || !visible) return null;

  return (
    <PageLoadingView
      message={message}
      showSlowMessage={showSlowMessage}
      slowMessage={slowMessage}
    />
  );
};

export default PageLoading;
