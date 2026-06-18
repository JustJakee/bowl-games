import { Stack, Typography } from "@mui/material";
import Panel from "../components/common/Panel";

const PlaceholderPage = ({ title, description = "Coming soon." }) => {
  return (
    <Panel elevated>
      <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary">
          Section
        </Typography>
        <Typography variant="h4" sx={{ textTransform: "uppercase" }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Panel>
  );
};

export default PlaceholderPage;
