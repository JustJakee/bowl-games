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
        <Typography
          variant="h6"
          sx={{
            textTransform: "uppercase",
            color: "primary.main",
            fontSize: { md: "1rem", lg: "1.1rem" },
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </Typography>
      </div>
      {actionLabel && actionTo ? (
        <Typography
          component={RouterLink}
          to={actionTo}
          variant="body2"
          sx={{
            textDecoration: "none",
            fontWeight: 700,
            fontSize: { md: "0.82rem", lg: "0.9rem" },
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default SectionHeader;
