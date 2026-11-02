import { Box, Link } from "@mui/material";

const BuilderCredit = () => (
  <Box sx={{ px: 2.5, pt: 1, pb: 2 }}>
    <Link
      href="https://www.twojakesdigital.com/"
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      aria-label="Built by Two Jakes (opens in a new tab)"
      sx={{
        display: "inline-block",
        color: "text.secondary",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.5,
        "&:hover": { color: "primary.main" },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 4,
          borderRadius: 0.5,
        },
      }}
    >
      Built by Two Jakes <span aria-hidden="true">↗</span>
    </Link>
  </Box>
);

export default BuilderCredit;
