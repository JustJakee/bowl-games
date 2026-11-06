import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import { Box, Typography } from "@mui/material";

const statusMessages = {
  offline: "You're offline. Live updates and saving are unavailable.",
  checking: "Reconnecting. Live updates and saving are unavailable.",
  unavailable: "Game data is unavailable. Live updates and saving are unavailable.",
};

export function OfflineNotice({ status }) {
  if (!statusMessages[status]) return null;

  return (
    <Box
      role="status"
      sx={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: { xs: "calc(80px + env(safe-area-inset-bottom))", lg: 16 },
        zIndex: (theme) => theme.zIndex.snackbar,
        width: "fit-content",
        maxWidth: "calc(100% - 32px)",
        mx: "auto",
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1,
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        bgcolor: "#07111f",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
        pointerEvents: "none",
      }}
    >
      <WifiOffRoundedIcon color="primary" fontSize="small" />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {statusMessages[status]}
      </Typography>
    </Box>
  );
}

export default function OfflineIndicator({ status }) {
  return <OfflineNotice status={status} />;
}
