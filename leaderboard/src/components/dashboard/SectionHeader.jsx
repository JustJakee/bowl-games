import { Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const SectionHeader = ({ title, eyebrow, actionLabel, actionTo }) => {
  return (
    <Stack direction="row" alignItems="end" justifyContent="space-between" spacing={2}>
      <div>
        {eyebrow ? (
          <Typography variant="overline" color="text.secondary">
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h6" sx={{ textTransform: "uppercase" }}>
          {title}
        </Typography>
      </div>
      {actionLabel && actionTo ? (
        <Typography
          component={RouterLink}
          to={actionTo}
          variant="body2"
          sx={{ textDecoration: "none", fontWeight: 700 }}
        >
          {actionLabel}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default SectionHeader;
