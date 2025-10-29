import { Box, Link, Typography } from "@mui/material";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: 4,
        py: 2,
        textAlign: "center",
        color: "var(--color-muted)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <Typography variant="body2">
        Built by <span role="img" aria-label="bicep">💪</span> Two-Jakes ·{" "}
        <Link
          href="https://github.com/JustJakee/bowl-games?tab=readme-ov-file"
          target="_blank"
          rel="noreferrer"
          underline="hover"
          color="inherit"
        >
          README
        </Link>{" "}
        <Box
          component="span"
          sx={{
            ml: 1,
            px: 1,
            py: 0.25,
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
            color: "var(--color-muted)",
            fontWeight: 700,
            fontSize: "0.75rem",
          }}
        >
          version 2.0.0
        </Box>
      </Typography>
    </Box>
  );
};

export default Footer;

