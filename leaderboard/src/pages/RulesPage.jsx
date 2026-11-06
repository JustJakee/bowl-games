import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import Panel from "../components/common/Panel.jsx";
import { useScoreboard } from "../context/NCAAFDataContext.jsx";
import { usePrizeSummary } from "../hooks/usePrizeSummary.js";
import {
  calculatePayouts,
  formatUsdCents,
  parsePayoutTiers,
} from "../../shared/prizeRules.mjs";
import { formatPayoutPercent, formatPlace, formatRulesDeadline } from "../utils/rulesPresentation.js";

const RuleSection = ({ title, children }) => (
  <Panel component="section" sx={{ minWidth: 0 }}>
    <Typography component="h2" variant="h6" sx={{ fontWeight: 800, mb: 1.25 }}>
      {title}
    </Typography>
    {children}
  </Panel>
);

const SummaryCard = ({ icon, label, value }) => (
  <Panel sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, borderTop: "3px solid", borderColor: "primary.main" }}>
    <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 850, fontSize: { xs: "1.1rem", sm: "1.3rem" }, overflowWrap: "anywhere" }}>{value}</Typography>
    </Box>
  </Panel>
);

export const RulesContent = ({ deadline, summary, loading, error, reload }) => {
  let tiers = null;
  let configurationError = "";
  try {
    tiers = parsePayoutTiers(summary?.payoutConfigJson);
  } catch {
    configurationError = "The published prize distribution is unavailable.";
  }
  const payouts = summary && tiers
    ? calculatePayouts(summary.prizePoolCents, tiers)
    : null;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ maxWidth: 1100, mx: "auto", minWidth: 0, pb: 2 }}>
      <Box component="header">
        <Typography component="h1" variant="h3" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" }, fontWeight: 900 }}>
          Rules &amp; Prizes
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Everything you need to know before kickoff.
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <SummaryCard icon={<PaidRoundedIcon fontSize="large" />} label="Entry Fee" value="$5.00 per player" />
        <SummaryCard icon={<LockClockRoundedIcon fontSize="large" />} label="Picks Lock" value={deadline} />
      </Box>

      <RuleSection title="Entry & Payment">
        <Typography>Entry is $5 per player. Only confirmed paid entries contribute to the prize pool.</Typography>
      </RuleSection>

      <RuleSection title="Pick Deadline">
        <Typography>
          All picks, including the required tiebreaker, must be completed before the official deadline.
          Once picks lock, no selections can be changed — even for games played later.
        </Typography>
        <Typography color="primary.main" sx={{ mt: 1.5, fontWeight: 700 }}>
          {deadline === "Deadline unavailable" ? deadline : `Current deadline: ${deadline}`}
        </Typography>
      </RuleSection>

      <RuleSection title="Scoring">
        <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, my: 0 }}>
          <li>Every correct bowl winner earns 1 point.</li>
          <li>An incorrect selection earns 0 points.</li>
          <li>Standings update as game results become final.</li>
        </Stack>
      </RuleSection>

      <RuleSection title="Tiebreaker">
        <Typography>A valid tiebreaker selection is required to complete your pick set.</Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>Exact tiebreaker rules: Details coming soon.</Typography>
      </RuleSection>

      <RuleSection title="Prizes & Payouts">
        {error ? (
          <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
            Prize information could not be refreshed. {summary ? "Showing the last loaded amounts." : "Amounts are unavailable."}
          </Alert>
        ) : null}
        {loading && !summary ? (
          <Typography color="text.secondary" role="status">Loading current prize information...</Typography>
        ) : summary ? (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5, mb: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Confirmed paid entries</Typography>
                <Typography sx={{ fontSize: "1.8rem", fontWeight: 850 }}>{summary.confirmedPaidEntryCount}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Current prize pool</Typography>
                <Typography color="primary.main" sx={{ fontSize: "1.8rem", fontWeight: 850 }}>
                  {formatUsdCents(summary.prizePoolCents)}
                </Typography>
              </Box>
            </Box>
            {configurationError ? <Alert severity="warning">{configurationError}</Alert> : null}
            {!tiers && !configurationError ? (
              <Typography>Prize distribution will be announced soon.</Typography>
            ) : null}
            {payouts ? (
              <Stack spacing={1.25} component="ol" sx={{ p: 0, m: 0, listStyle: "none" }}>
                {payouts.map((tier) => (
                  <Box component="li" key={tier.position} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5, borderRadius: 2, bgcolor: "rgba(212,175,55,0.08)", minWidth: 0 }}>
                    <EmojiEventsRoundedIcon aria-hidden="true" sx={{ color: "primary.main", flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 750 }}>{formatPlace(tier.position)} place{tier.label ? ` — ${tier.label}` : ""}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatPayoutPercent(tier.percentageBasisPoints)} of the pool</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 850, color: "primary.main", whiteSpace: "nowrap" }}>
                      {formatUsdCents(tier.payoutCents)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              These are current amounts. The paid entry count may change before payouts are finalized.
            </Typography>
          </>
        ) : (
          <Typography color="text.secondary">Prize information is unavailable right now.</Typography>
        )}
      </RuleSection>
    </Stack>
  );
};

const RulesPage = () => {
  const { seasonConfig, rawGames } = useScoreboard();
  const { summary, loading, error, reload } = usePrizeSummary();
  const deadline = formatRulesDeadline(seasonConfig?.picksLockAt, rawGames);
  return <RulesContent deadline={deadline} summary={summary} loading={loading} error={error} reload={reload} />;
};

export default RulesPage;
