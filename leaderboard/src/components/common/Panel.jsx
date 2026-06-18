import { Paper } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { themeTokens } from "../../theme/theme";

const Panel = ({ children, elevated = false, sx = {}, ...props }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        backgroundColor: elevated
          ? alpha(themeTokens.panelBackgroundElevated, 0.96)
          : alpha(themeTokens.panelBackground, 0.94),
        borderRadius: 4,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
};

export default Panel;
