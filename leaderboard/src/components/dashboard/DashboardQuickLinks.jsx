import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import Grid from "@mui/material/Grid2";
import { Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Panel from "../common/Panel";

const iconMap = {
  schedule: ScheduleRoundedIcon,
  rules: GavelRoundedIcon,
  help: HelpOutlineRoundedIcon,
};

const DashboardQuickLinks = ({ links }) => {
  return (
    <Grid container spacing={1.5}>
      {links.map((link) => {
        const Icon = iconMap[link.icon] || HelpOutlineRoundedIcon;
        return (
          <Grid key={link.to} size={{ xs: 12, sm: 4 }}>
            <Panel
              component={RouterLink}
              to={link.to}
              sx={{
                display: "block",
                textDecoration: "none",
                height: "100%",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Stack spacing={1.25}>
                <Icon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle2">{link.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {link.description}
                </Typography>
              </Stack>
            </Panel>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default DashboardQuickLinks;
