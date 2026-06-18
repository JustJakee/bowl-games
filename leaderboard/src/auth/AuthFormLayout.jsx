import { Alert, Box, Typography } from "@mui/material";

const AuthFormLayout = ({ title, description, error, success, children }) => {
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {description}
      </Typography>
      {error ? <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mt: 3 }}>{success}</Alert> : null}
      <Box sx={{ mt: 3.5 }}>{children}</Box>
    </Box>
  );
};

export default AuthFormLayout;
