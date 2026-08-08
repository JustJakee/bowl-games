import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Drawer, MenuItem,
  Select, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, useMediaQuery,
} from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useScoreboard } from "../context/NCAAFDataContext";
import { loadAdminGames, updateAdminGame } from "../data/adminGamesRepository";
import {
  ADMIN_GAME_STATUSES, formatAdminGameStatus, getGameWinner,
  isAdminGameManagementEnabled, toGameUpdateInput, validateGameDraft,
} from "../utils/adminGameManagement";
import Panel from "../components/common/Panel";

const toLocalInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const fromLocalInput = (value) => value ? new Date(value).toISOString() : "";
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value)) : "—";
const teamName = (game, side) => game?.[`team${side}DisplayName`] || game?.[`team${side}`] || game?.[`team${side}Abbr`] || "Team";
const scoreText = (game) => ["in_progress", "final"].includes(game.status) ? `${game.teamAScore ?? 0} – ${game.teamBScore ?? 0}` : "—";
const statusChipColor = (status) => ({ scheduled: "info", in_progress: "warning", final: "success", canceled: "default" }[status] || "default");
const makeDraft = (game) => ({ ...game, kickoffAt: toLocalInput(game.kickoffAt), teamAScore: game.teamAScore ?? "", teamBScore: game.teamBScore ?? "" });
const sameDraft = (left, right) => JSON.stringify(toGameUpdateInput(left)) === JSON.stringify(toGameUpdateInput(right));

const AdminGamesPage = () => {
  const { role } = useAuth();
  const { season } = useScoreboard();
  const narrow = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState(null);
  const [originalDraft, setOriginalDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [toast, setToast] = useState("");
  const loadedSeasonId = useRef("");

  const canManageGames = role === "admin" && isAdminGameManagementEnabled(season);
  const load = async () => {
    if (!season?.id || !canManageGames) return;
    const initial = loadedSeasonId.current !== season.id;
    if (initial) setLoading(true);
    setError("");
    try {
      const rows = await loadAdminGames({ seasonId: season.id });
      setGames(rows);
      loadedSeasonId.current = season.id;
    } catch (loadError) {
      setError(loadError.message || "Unable to load games.");
    } finally { if (initial) setLoading(false); }
  };

  useEffect(() => { void load(); }, [season?.id, canManageGames]); // selected-season changes are the only fetch trigger

  const visibleGames = useMemo(() => games.filter((game) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [game.bowlName, teamName(game, "A"), teamName(game, "B")]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesSearch && (status === "all" || game.status === status);
  }), [games, search, status]);

  const openEditor = (game) => { const next = makeDraft(game); setDraft(next); setOriginalDraft(next); };
  const closeEditor = () => {
    if (draft && originalDraft && !sameDraft(draft, originalDraft)) setDiscardOpen(true);
    else { setDraft(null); setOriginalDraft(null); }
  };
  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async () => {
    const validationError = validateGameDraft(draft);
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError("");
    try {
      const updated = await updateAdminGame(toGameUpdateInput({ ...draft, kickoffAt: fromLocalInput(draft.kickoffAt) }));
      setGames((current) => current.map((game) => game.id === updated.id ? updated : game));
      setToast(`${updated.bowlName} updated.`);
      setDraft(null); setOriginalDraft(null);
    } catch (saveError) { setToast(saveError.message || "Unable to update this game. No changes were saved."); }
    finally { setSaving(false); }
  };

  if (!canManageGames) return <Navigate to="/admin/entries" replace />;
  const StatusChip = ({ value }) => <Chip size="small" color={statusChipColor(value)} label={formatAdminGameStatus(value)} />;
  const editButton = (game) => <Button size="small" onClick={() => openEditor(game)}>Edit</Button>;

  return <Stack spacing={{ xs: 1.75, md: 2.5 }}>
    <Box>
      <Stack direction="row" spacing={1} alignItems="center"><Typography variant="h3">Games</Typography><Chip size="small" color="primary" label="Test Season" /></Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Manage game data for {season?.name || "the current test season"}. Changes are reflected in test-season player views.</Typography>
    </Box>
    <Panel sx={{ p: { xs: 1.25, md: 1.5 } }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <TextField size="small" label="Search bowl or team" value={search} onChange={(event) => setSearch(event.target.value)} fullWidth />
      <Select size="small" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: { sm: 180 } }}>
        <MenuItem value="all">All statuses</MenuItem>{ADMIN_GAME_STATUSES.map((value) => <MenuItem key={value} value={value}>{formatAdminGameStatus(value)}</MenuItem>)}
      </Select>
    </Stack></Panel>
    {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}
    {loading && !games.length ? <CircularProgress /> : narrow ? <Stack spacing={1.25}>
      {visibleGames.map((game) => <Panel key={game.id} sx={{ p: 1.5 }}><Stack spacing={1}><Typography fontWeight={800}>{game.bowlName}</Typography><Typography>{teamName(game, "A")}<br />vs<br />{teamName(game, "B")}</Typography><Typography variant="body2" color="text.secondary">{formatDate(game.kickoffAt)}</Typography><Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" spacing={1} alignItems="center"><StatusChip value={game.status} /><Typography variant="body2">{scoreText(game)}</Typography></Stack>{editButton(game)}</Stack></Stack></Panel>)}
    </Stack> : <Panel sx={{ p: 0, overflow: "auto" }}><Table size="small"><TableHead><TableRow><TableCell>Date / Time</TableCell><TableCell>Bowl</TableCell><TableCell>Matchup</TableCell><TableCell>Status</TableCell><TableCell>Score</TableCell><TableCell>Edit</TableCell></TableRow></TableHead><TableBody>{visibleGames.map((game) => <TableRow hover key={game.id}><TableCell>{formatDate(game.kickoffAt)}</TableCell><TableCell>{game.bowlName}</TableCell><TableCell>{teamName(game, "A")} vs {teamName(game, "B")}</TableCell><TableCell><StatusChip value={game.status} /></TableCell><TableCell>{scoreText(game)}</TableCell><TableCell>{editButton(game)}</TableCell></TableRow>)}{!visibleGames.length ? <TableRow><TableCell colSpan={6}>No games match the current filters.</TableCell></TableRow> : null}</TableBody></Table></Panel>}
    <Drawer anchor="right" open={Boolean(draft)} onClose={closeEditor} PaperProps={{ sx: { width: { xs: "100%", sm: 500 }, maxWidth: "100%" } }}>
      {draft ? <Stack sx={{ height: "100%" }}><Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="h5">Edit Game</Typography><Typography variant="body2" color="text.secondary">{teamName(draft, "A")} vs {teamName(draft, "B")}</Typography></Box>
        <Stack spacing={2} sx={{ p: 2, overflowY: "auto", flex: 1 }}><TextField label="Bowl name" value={draft.bowlName || ""} onChange={(e) => updateDraft("bowlName", e.target.value)} fullWidth /><TextField label="Kickoff date/time" type="datetime-local" value={draft.kickoffAt || ""} onChange={(e) => updateDraft("kickoffAt", e.target.value)} InputLabelProps={{ shrink: true }} fullWidth /><TextField label="TV / network" value={draft.network || ""} onChange={(e) => updateDraft("network", e.target.value)} fullWidth /><TextField label="Venue" value={draft.venueName || ""} onChange={(e) => updateDraft("venueName", e.target.value)} fullWidth /><TextField label="Location" value={draft.location || ""} onChange={(e) => updateDraft("location", e.target.value)} fullWidth />
          <Box><Typography variant="overline">Status</Typography><Select value={draft.status} onChange={(e) => {
            const nextStatus = e.target.value;
            setDraft((current) => ({
              ...current,
              status: nextStatus,
              // Resetting a test game to Scheduled/Canceled returns it to a
              // clean, unscored state for repeatable player-view testing.
              ...(nextStatus === "scheduled" || nextStatus === "canceled"
                ? { teamAScore: "", teamBScore: "", statusDetail: "" }
                : {}),
            }));
          }} fullWidth>{ADMIN_GAME_STATUSES.map((value) => <MenuItem key={value} value={value}>{formatAdminGameStatus(value)}</MenuItem>)}</Select></Box>
          {["in_progress", "final"].includes(draft.status) ? <Stack direction="row" spacing={1}><TextField label={`${teamName(draft, "A")} score`} type="number" value={draft.teamAScore} onChange={(e) => updateDraft("teamAScore", e.target.value)} inputProps={{ min: 0 }} fullWidth /><TextField label={`${teamName(draft, "B")} score`} type="number" value={draft.teamBScore} onChange={(e) => updateDraft("teamBScore", e.target.value)} inputProps={{ min: 0 }} fullWidth /></Stack> : null}
          {draft.status === "in_progress" ? <TextField label="Live detail (for example, Q3 8:12)" value={draft.statusDetail || ""} onChange={(e) => updateDraft("statusDetail", e.target.value)} fullWidth /> : null}
          {draft.status === "final" ? <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}><Typography variant="body2" color="text.secondary">Winner</Typography><Typography fontWeight={800}>{getGameWinner(draft) ? (getGameWinner(draft) === draft.teamAAbbr ? teamName(draft, "A") : teamName(draft, "B")) : "Set unequal final scores to determine a winner."}</Typography></Box> : null}
        </Stack><Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}><Button onClick={closeEditor} disabled={saving}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Game"}</Button></Stack></Stack> : null}
    </Drawer>
    <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)}><DialogTitle>Discard changes?</DialogTitle><DialogContent><DialogContentText>Your edits to this game have not been saved.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDiscardOpen(false)}>Keep Editing</Button><Button color="error" onClick={() => { setDiscardOpen(false); setDraft(null); setOriginalDraft(null); }}>Discard</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast("")} message={toast} />
  </Stack>;
};

export default AdminGamesPage;
