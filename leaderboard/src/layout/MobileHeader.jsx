// UI — NAVIGATION — REACT
import { IconButton, Stack, Typography } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

const MobileHeader = ({ onOpenMenu }) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ py: 1.5 }}
    >
      <Typography variant="subtitle1" noWrap sx={{ textTransform: "uppercase", minWidth: 0 }}>
        Bob's Bowl Games
      </Typography>
      <IconButton aria-label="Open navigation menu" onClick={onOpenMenu} sx={{ flexShrink: 0, ml: 1 }}>
        <MenuRoundedIcon />
      </IconButton>
    </Stack>
  );
};

export default MobileHeader;
