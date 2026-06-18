import { IconButton, Stack, Typography } from "@mui/material";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

const MobileHeader = ({ onOpenMenu }) => {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StarsRoundedIcon sx={{ color: "primary.main" }} />
        <Typography variant="subtitle1" sx={{ textTransform: "uppercase" }}>
          Bob's Bowl Games
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1}>
        <IconButton aria-label="Open navigation menu" onClick={onOpenMenu}>
          <MenuRoundedIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
};

export default MobileHeader;
