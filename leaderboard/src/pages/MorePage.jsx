import { Button, Stack, Typography } from "@mui/material";
import Panel from "../components/common/Panel";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";
import { Link as RouterLink } from "react-router-dom";

const MorePage = () => {
  const { email, role, groups } = useAuth();
  const { profile } = useUserProfile();

  return (
    <Stack spacing={2}>
      <Panel elevated>
        <Stack spacing={2}>
          <div>
            <Typography variant="overline" color="text.secondary">
              Account
            </Typography>
            <Typography variant="h4" sx={{ textTransform: "uppercase" }}>
              More
            </Typography>
          </div>
          <Typography variant="body1">
            Username: {profile?.username || "Not set"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: {email || "Unavailable"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {role || "unassigned"}
            {groups?.length ? ` (${groups.join(", ")})` : ""}
          </Typography>
          {role === "admin" ? (
            <Button component={RouterLink} to="/admin/entries" variant="outlined">
              Open Admin Workspace
            </Button>
          ) : null}
        </Stack>
      </Panel>
    </Stack>
  );
};

export default MorePage;
