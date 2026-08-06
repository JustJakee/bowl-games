import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useScoreboard } from "../context/NCAAFDataContext";
import {
  loadAdminEntries,
  updateAdminEntryPayment,
} from "../data/adminEntriesRepository";
import PaymentStatusChip from "../components/common/PaymentStatusChip";
import Panel from "../components/common/Panel";
import { isSeasonPickLocked } from "../utils/pickWindow";

const paid = (value) => String(value || "").toUpperCase() === "PAID";

const PickCompletion = ({ row }) => {
  const complete = row.completedPicks === row.totalPicks && row.totalPicks > 0;
  return (
    <Stack spacing={0.4} alignItems="flex-start">
      <Typography variant="body2">
        {row.completedPicks} / {row.totalPicks}
      </Typography>
      <Chip
        size="small"
        label={complete ? "Complete" : "Incomplete"}
        color={complete ? "success" : "warning"}
      />
    </Stack>
  );
};

const AdminEntriesPage = () => {
  const { season, seasonConfig, allGames } = useScoreboard();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("all");
  const [completion, setCompletion] = useState("all");
  const [saving, setSaving] = useState("");
  const [toast, setToast] = useState("");
  const loadedSeasonId = useRef("");
  const loadRequestId = useRef(0);

  // The scoreboard replaces its game array while polling. IDs are the actual
  // input to entry completion, so this prevents identical polls from refetching.
  const requiredGameIds = useMemo(
    () => (allGames || []).map((game) => game.id).filter(Boolean).sort(),
    [allGames],
  );
  const requiredGameIdsKey = requiredGameIds.join("|");
  const picksLocked = isSeasonPickLocked({
    seasonStatus: season?.status,
    picksLockAt: seasonConfig?.picksLockAt,
  });
  const effectiveCompletion =
    picksLocked && completion === "incomplete" ? "all" : completion;

  const load = async ({ force = false } = {}) => {
    if (!season?.id) return;

    const requestId = ++loadRequestId.current;
    const isInitialLoad = loadedSeasonId.current !== season.id;
    if (isInitialLoad) setLoading(true);
    else if (force) setRefreshing(true);
    setError("");

    try {
      const nextRows = await loadAdminEntries({
        seasonId: season.id,
        requiredGameIds,
      });
      if (requestId !== loadRequestId.current) return;
      setRows(nextRows);
      loadedSeasonId.current = season.id;
    } catch (loadError) {
      if (requestId !== loadRequestId.current) return;
      setError(loadError.message || "Unable to load entries.");
    } finally {
      if (requestId !== loadRequestId.current) return;
      if (isInitialLoad) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // `requiredGameIdsKey`, rather than the polling array reference, is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season?.id, requiredGameIdsKey]);

  const eligibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const complete =
          row.completedPicks === row.totalPicks && row.totalPicks > 0;
        // Once the window closes, incomplete pick sets cannot participate and
        // are intentionally omitted from the administrative season view.
        return !picksLocked || complete;
      }),
    [rows, picksLocked],
  );

  const visibleRows = useMemo(
    () =>
      eligibleRows.filter((row) => {
        const query = search.toLowerCase();
        const complete =
          row.completedPicks === row.totalPicks && row.totalPicks > 0;
        const matchesSearch =
          !query ||
          [row.playerName, row.playerEmail, row.entryName].some((value) =>
            String(value).toLowerCase().includes(query),
          );
        const matchesPayment =
          payment === "all" ||
          (payment === "paid"
            ? paid(row.paymentStatus)
            : !paid(row.paymentStatus));
        const matchesCompletion =
          effectiveCompletion === "all" ||
          (effectiveCompletion === "complete" ? complete : !complete);
        return matchesSearch && matchesPayment && matchesCompletion;
      }),
    [eligibleRows, search, payment, effectiveCompletion],
  );

  const togglePayment = async (row) => {
    if (saving) return;
    const nextStatus = paid(row.paymentStatus) ? "unpaid" : "paid";
    setSaving(row.id);

    try {
      await updateAdminEntryPayment({
        entryId: row.id,
        paymentStatus: nextStatus,
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, paymentStatus: nextStatus }
            : item,
        ),
      );
      setToast(
        `${row.playerName} marked as ${
          nextStatus === "paid" ? "Paid" : "Payment Due"
        }.`,
      );
    } catch {
      setToast("Unable to update payment status. No changes were saved.");
    } finally {
      setSaving("");
    }
  };

  const paymentButton = (row) => (
    <Button
      disabled={saving === row.id}
      onClick={() => togglePayment(row)}
      sx={{ p: 0, minWidth: 0, justifyContent: "flex-start" }}
    >
      <PaymentStatusChip paymentStatus={row.paymentStatus} />
    </Button>
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h3">Entries</Typography>
        <Typography color="text.secondary">
          Manage active player pick sets and payment status.
        </Typography>
      </Box>

      <Panel sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <TextField
            size="small"
            label="Search entries"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ flex: 1 }}
          />
          <Select
            size="small"
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
          >
            <MenuItem value="all">All payments</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="due">Payment Due</MenuItem>
          </Select>
          <Select
            size="small"
            value={effectiveCompletion}
            onChange={(event) => setCompletion(event.target.value)}
          >
            <MenuItem value="all">All picks</MenuItem>
            <MenuItem value="complete">Complete</MenuItem>
            {!picksLocked ? <MenuItem value="incomplete">Incomplete</MenuItem> : null}
          </Select>
          <Button
            onClick={() => load({ force: true })}
            disabled={refreshing}
            startIcon={<RefreshRoundedIcon />}
          >
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </Stack>
      </Panel>

      {error ? <Alert severity="error">{error}</Alert> : null}
      <Typography variant="body2" color="text.secondary">
        {visibleRows.length} of {eligibleRows.length} active entries
      </Typography>

      {loading && rows.length === 0 ? (
        <CircularProgress />
      ) : isMobile ? (
        <Stack spacing={1.25}>
          {visibleRows.map((row) => (
            <Panel key={row.id} sx={{ p: 1.75 }}>
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {row.playerName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {row.playerEmail}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pick Set
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {row.entryName || "Unnamed pick set"}
                  </Typography>
                </Box>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Picks
                    </Typography>
                    <PickCompletion row={row} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Payment Status
                    </Typography>
                    {paymentButton(row)}
                  </Box>
                </Stack>
              </Stack>
            </Panel>
          ))}
          {!visibleRows.length ? (
            <Panel>
              <Typography color="text.secondary">
                No entries match the current filters.
              </Typography>
            </Panel>
          ) : null}
        </Stack>
      ) : (
        <Panel sx={{ p: 0, overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Player Name</TableCell>
                <TableCell>Player Email</TableCell>
                <TableCell>Pick Set Name</TableCell>
                <TableCell>Picks</TableCell>
                <TableCell>Payment Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.playerName}</TableCell>
                  <TableCell>{row.playerEmail}</TableCell>
                  <TableCell>{row.entryName}</TableCell>
                  <TableCell><PickCompletion row={row} /></TableCell>
                  <TableCell>{paymentButton(row)}</TableCell>
                </TableRow>
              ))}
              {!visibleRows.length ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    No entries match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast("")}
        message={toast}
      />
    </Stack>
  );
};

export default AdminEntriesPage;
