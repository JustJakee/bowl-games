import { Button, Stack, Typography } from "@mui/material";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const DesktopHeader = ({ username, signOut }) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ py: { md: 2.25, lg: 2.5 } }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <StarsRoundedIcon sx={{ color: "primary.main" }} />
        <Typography
          variant="h5"
          sx={{
            textTransform: "uppercase",
            fontSize: { md: "1.2rem", lg: "1.35rem" },
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          Bob's Bowl Games
        </Typography>
        <StarsRoundedIcon sx={{ color: "primary.main" }} />
      </Stack>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <PersonOutlineRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { md: "0.9rem", lg: "0.95rem" } }}
        >
          {username}
        </Typography>
        <Button variant="text" color="inherit" startIcon={<LogoutRoundedIcon />} onClick={signOut}>
          Sign Out
        </Button>
      </Stack>
    </Stack>
  );
};

export default DesktopHeader;
