import { Stack, Typography } from "@mui/material";

const EmptyState = ({ title, description }) => {
  return (
    <Stack spacing={1} alignItems="flex-start" justifyContent="center" sx={{ py: 2 }}>
      <Typography variant="subtitle1">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
};

export default EmptyState;
