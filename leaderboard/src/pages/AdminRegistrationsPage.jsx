import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import Panel from "../components/common/Panel";
import { approveRegistration, listPendingRegistrations } from "../data/registrationRepository";

export default function AdminRegistrationsPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPending(await listPendingRegistrations());
    } catch (loadError) {
      setError(loadError?.message || "Unable to load pending registrations.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const approve = async (username) => {
    setApproving(username);
    setError("");
    setNotice("");
    try {
      await approveRegistration(username);
      setPending((current) => current.filter((user) => user.username !== username));
      setNotice("Player access approved. The member can refresh their session to continue.");
    } catch (approvalError) {
      setError(approvalError?.message || "Unable to approve registration.");
    } finally {
      setApproving("");
    }
  };

  return <Stack spacing={2}>
    <Panel elevated>
      <Typography variant="overline" color="text.secondary">Accounts</Typography>
      <Typography variant="h4" sx={{ textTransform: "uppercase" }}>Pending approval</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Verified email addresses appear here. Approval grants the player group; it does not open a season or change pick deadlines.
      </Typography>
    </Panel>
    {error ? <Alert severity="error">{error}</Alert> : null}
    {notice ? <Alert severity="success">{notice}</Alert> : null}
    <Panel>
      <Stack spacing={2}>
        <Button variant="outlined" onClick={refresh} disabled={loading || Boolean(approving)} sx={{ alignSelf: "flex-start" }}>Refresh registrations</Button>
        {loading ? <CircularProgress size={24} /> : null}
        {!loading && pending.length === 0 ? <Typography>No verified accounts are waiting for approval.</Typography> : null}
        {!loading && pending.map((user) => <Box key={user.username} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between", borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Box>
            <Typography fontWeight={700}>{user.email}</Typography>
            <Typography variant="caption" color="text.secondary">Registered {user.createdAt ? new Date(user.createdAt).toLocaleString() : "recently"}</Typography>
          </Box>
          <Button variant="contained" disabled={Boolean(approving)} onClick={() => approve(user.username)}>{approving === user.username ? "Approving..." : "Approve player"}</Button>
        </Box>)}
      </Stack>
    </Panel>
  </Stack>;
}
