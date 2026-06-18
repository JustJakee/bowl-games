import { Stack, Typography } from "@mui/material";
import Panel from "../components/common/Panel";
import { useAuth } from "../auth/AuthContext.jsx";
import { useUserProfile } from "../auth/UserProfileContext.jsx";

const MorePage = () => {
  const { email, role, groups } = useAuth();
  const { profile } = useUserProfile();

  return (
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
        <Typography variant="body1">Username: {profile?.username || "Not set"}</Typography>
        <Typography variant="body2" color="text.secondary">
          Email: {email || "Unavailable"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Role: {role || "unassigned"}{groups?.length ? ` (${groups.join(", ")})` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Public signup is still disabled. Account and help surfaces will expand in a later milestone.
        </Typography>
      </Stack>
    </Panel>
  );
};

export default MorePage;
