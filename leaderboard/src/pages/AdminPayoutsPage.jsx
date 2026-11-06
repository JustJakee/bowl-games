import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, IconButton, Stack, TextField, Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Panel from "../components/common/Panel.jsx";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { usePrizeSummary } from "../hooks/usePrizeSummary.js";
import { publishSeasonPayouts } from "../data/prizeRepository.js";
import { formatUsdCents, parsePayoutTiers, validatePayoutTiers } from "../../shared/prizeRules.mjs";
import { formatPlace } from "../utils/rulesPresentation.js";

const toDraft = (tiers) => (tiers || []).map((tier) => ({
  position: tier.position,
  percent: String(tier.percentageBasisPoints / 100),
  label: tier.label || "",
}));

export const normalizePayoutDraft = (draft) => validatePayoutTiers(draft.map((tier) => {
  const value = String(tier.percent).trim();
  if (!/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(value))
    throw new Error("Enter each percentage with no more than two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const percentageBasisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return {
    position: tier.position,
    percentageBasisPoints,
    label: tier.label,
  };
}));

const AdminPayoutsPage = () => {
  const { season } = useScoreboard();
  const { summary, loading, error, reload } = usePrizeSummary();
  const [draft, setDraft] = useState([]);
  const [draftError, setDraftError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const draftScopeRef = useRef("");

  useEffect(() => {
    const scope = `${season?.id || ""}:${summary?.payoutConfigJson || ""}`;
    if (dirty && draftScopeRef.current.startsWith(`${season?.id || ""}:`)) return;
    try {
      setDraft(toDraft(parsePayoutTiers(summary?.payoutConfigJson)));
      setDraftError("");
    } catch {
      setDraft([]);
      setDraftError("The saved payout configuration is invalid. Enter a new distribution.");
    }
    draftScopeRef.current = scope;
    setDirty(false);
  }, [season?.id, summary?.payoutConfigJson]);

  const update = (index, field, value) => {
    setDraft((current) => current.map((tier, tierIndex) =>
      tierIndex === index ? { ...tier, [field]: value } : tier,
    ));
    setDirty(true);
    setDraftError("");
    setMessage("");
  };
  const addTier = () => {
    if (draft.length >= 20) return;
    setDraft((current) => [...current, { position: current.length + 1, percent: "", label: "" }]);
    setDirty(true);
    setDraftError("");
  };
  const removeTier = (index) => {
    setDraft((current) => current.filter((_, tierIndex) => tierIndex !== index)
      .map((tier, tierIndex) => ({ ...tier, position: tierIndex + 1 })));
    setDirty(true);
    setDraftError("");
  };
  const save = async () => {
    let tiers;
    try {
      tiers = normalizePayoutDraft(draft);
    } catch (validationError) {
      setDraftError(validationError.message);
      return;
    }
    setSaving(true);
    setDraftError("");
    setMessage("");
    try {
      await publishSeasonPayouts({ seasonId: season.id, tiers });
      setDirty(false);
      setMessage("Payout distribution published.");
      await reload();
    } catch (saveError) {
      setDraftError(saveError.message || "The payout distribution could not be published.");
    } finally {
      setSaving(false);
    }
  };

  const totalPercent = draft.reduce((sum, tier) => sum + (Number(tier.percent) || 0), 0);
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 850, mx: "auto", minWidth: 0 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 900 }}>Season Payouts</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Publish percentages for {season?.name || "the active season"}. Amounts change as confirmed payments change.
        </Typography>
      </Box>
      <Panel>
        {loading && !summary ? <CircularProgress size={24} aria-label="Loading prize information" /> : null}
        {error ? <Alert severity="warning" action={<Button color="inherit" onClick={reload}>Retry</Button>}>{error}</Alert> : null}
        {summary ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
            <Box><Typography color="text.secondary" variant="body2">Confirmed paid entries</Typography><Typography variant="h5">{summary.confirmedPaidEntryCount}</Typography></Box>
            <Box><Typography color="text.secondary" variant="body2">Current prize pool</Typography><Typography variant="h5" color="primary.main">{formatUsdCents(summary.prizePoolCents)}</Typography></Box>
          </Stack>
        ) : null}
      </Panel>
      <Panel component="section">
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>Winning places</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, mb: 2 }}>
          Percentages must total exactly 100%. No distribution is published until you save it.
        </Typography>
        {draft.length === 0 ? <Typography sx={{ mb: 2 }}>No payout distribution configured.</Typography> : null}
        <Stack spacing={1.5}>
          {draft.map((tier, index) => (
            <Box key={tier.position} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{formatPlace(tier.position)} place</Typography>
                <IconButton aria-label={`Remove ${formatPlace(tier.position)} place`} onClick={() => removeTier(index)}><DeleteOutlineRoundedIcon /></IconButton>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 150px" }, gap: 1.5 }}>
                <TextField label="Label (optional)" size="small" value={tier.label} onChange={(event) => update(index, "label", event.target.value)} inputProps={{ maxLength: 60 }} sx={{ minWidth: 0 }} />
                <TextField label="Percent" type="number" size="small" value={tier.percent} onChange={(event) => update(index, "percent", event.target.value)} inputProps={{ min: 0.01, max: 100, step: 0.01 }} sx={{ minWidth: 0 }} />
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }} alignItems={{ sm: "center" }}>
          <Button startIcon={<AddRoundedIcon />} variant="outlined" onClick={addTier} disabled={draft.length >= 20}>Add place</Button>
          <Typography variant="body2" color={totalPercent === 100 ? "success.main" : "text.secondary"}>Total: {totalPercent.toFixed(2)}%</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={save} disabled={saving || !dirty || !summary}>{saving ? "Publishing..." : "Publish payouts"}</Button>
        </Stack>
        {draftError ? <Alert severity="error" sx={{ mt: 2 }}>{draftError}</Alert> : null}
        {message ? <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert> : null}
      </Panel>
    </Stack>
  );
};

export default AdminPayoutsPage;
