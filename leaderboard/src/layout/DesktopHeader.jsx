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
      sx={{ py: 2.25 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <StarsRoundedIcon sx={{ color: "primary.main" }} />
        <Typography variant="h5" sx={{ textTransform: "uppercase" }}>
          Bob's Bowl Games
        </Typography>
        <StarsRoundedIcon sx={{ color: "primary.main" }} />
      </Stack>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <PersonOutlineRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography variant="body2" color="text.secondary">
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
