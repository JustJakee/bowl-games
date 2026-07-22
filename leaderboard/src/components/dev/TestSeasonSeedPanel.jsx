// SEED — TEST26 — REACT
import { useState } from "react";
import { Alert, Button, Chip, Stack, Typography } from "@mui/material";
import Panel from "../common/Panel";
import { seedTestSeason } from "../../data/testSeasonSeedRepository";

const ENABLE_SEEDING =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_TEST_SEASON_SEEDING === "true";

const TestSeasonSeedPanel = ({ role }) => {
  const [status, setStatus] = useState("idle");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  if (!ENABLE_SEEDING || role !== "admin") {
    return null;
  }

  const handleSeed = async () => {
    setStatus("loading");
    setSummary(null);
    setError("");

    try {
      const result = await seedTestSeason();
      setSummary(result);
      setStatus("success");
    } catch (seedError) {
      setError(seedError?.message || "Unable to seed the test season.");
      setStatus("error");
    }
  };

  return (
    <Panel elevated>
      <Stack spacing={2}>
        <div>
          <Typography variant="overline" color="text.secondary">
            Development Tools
          </Typography>
          <Typography variant="h6">Seed test26 Season</Typography>
        </div>
        <Typography variant="body2" color="text.secondary">
          Admin-only development action. This seeds or updates the
          backend-backed `test26` season and its mock games without deleting
          unrelated records.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="test26" size="small" />
          <Chip label="Idempotent" size="small" variant="outlined" />
          <Chip label="Mock source only" size="small" variant="outlined" />
        </Stack>
        <Button
          variant="contained"
          onClick={handleSeed}
          disabled={status === "loading"}
          sx={{ alignSelf: "flex-start" }}
        >
          {status === "loading" ? "Seeding..." : "Seed test26"}
        </Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {summary ? (
          <Alert severity={summary.failed > 0 ? "warning" : "success"}>
            Created: {summary.created} | Updated: {summary.updated} | Skipped:{" "}
            {summary.skipped} | Failed: {summary.failed}
            {summary.failures?.length ? ` | ${summary.failures[0]}` : ""}
          </Alert>
        ) : null}
      </Stack>
    </Panel>
  );
};

export default TestSeasonSeedPanel;
