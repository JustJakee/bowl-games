import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import Panel from "../components/common/Panel.jsx";
import { useInstallApp } from "../pwa/InstallContext.jsx";

const isAppleMobile = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function InstallPageView({ installed, canPrompt, promptInstall, appleMobile }) {
  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Stack spacing={2.5}>
        <Box component="header">
          <Typography variant="h4" component="h1" sx={{ textTransform: "uppercase" }}>
            Install App
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Put Bob&apos;s Bowl Games on your home screen for quick access.
          </Typography>
        </Box>

        <Panel component="section" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack spacing={2} alignItems="flex-start">
            {installed ? (
              <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ width: "100%" }}>
                You&apos;re using the installed app.
              </Alert>
            ) : canPrompt ? (
              <>
                <Typography variant="body1">
                  Add the app to your device in one step.
                </Typography>
                <Button variant="contained" size="large" startIcon={<DownloadRoundedIcon />} onClick={promptInstall}>
                  Add to Home Screen
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" component="h2">
                  Add it from your browser
                </Typography>
                <Typography color="text.secondary">
                  {appleMobile
                    ? "Tap the Share button in your browser, then choose Add to Home Screen."
                    : "Open your browser menu and choose Install app or Add to Home screen. On a desktop, you may also see an install icon in the address bar."}
                </Typography>
              </>
            )}
          </Stack>
        </Panel>

        <Alert severity="info">
          The app needs an internet connection to sign in, load live scores, and save picks.
          When you are offline, it will tell you to reconnect.
        </Alert>
      </Stack>
    </Box>
  );
}

export default function InstallPage() {
  const { installed, canPrompt, promptInstall } = useInstallApp();
  return (
    <InstallPageView
      installed={installed}
      canPrompt={canPrompt}
      promptInstall={promptInstall}
      appleMobile={isAppleMobile()}
    />
  );
}
