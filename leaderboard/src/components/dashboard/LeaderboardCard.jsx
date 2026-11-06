import {
  Alert,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import Panel from "../common/Panel";
import SectionHeader from "./SectionHeader";

const LeaderboardCard = ({
  rows,
  currentUsername,
  error = "",
  loading = false,
  unavailable = false,
  onRetry,
}) => {
  const theme = useTheme();
  const showRecord = useMediaQuery(theme.breakpoints.up("lg"));
  const hasRows = Array.isArray(rows) && rows.length > 0;

  return (
    <Panel sx={{ width: "100%", height: "100%" }}>
      <SectionHeader title="Leaderboard Snapshot" />
      {error ? (
        <Alert
          severity="warning"
          sx={{ mt: 1.5 }}
          action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}
        >
          {hasRows
            ? "Leaderboard updates are unavailable. Shown results may be out of date."
            : "Leaderboard is unavailable. Retry when connected."}
        </Alert>
      ) : null}
      {loading && !hasRows ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Loading leaderboard...
        </Typography>
      ) : (error || unavailable) && !hasRows ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Leaderboard unavailable.
        </Typography>
      ) : hasRows ? (
        <TableContainer sx={{ mt: 1.5 }}>
          <Table size="small" aria-label="Leaderboard preview">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Username</TableCell>
                <TableCell align="right">Points</TableCell>
                {showRecord ? (
                  <TableCell align="right">Record</TableCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const isCurrentUser =
                  row.username.toLowerCase() ===
                  (currentUsername || "").toLowerCase();

                return (
                  <TableRow
                    key={`${row.rank}-${row.username}`}
                    sx={{
                      backgroundColor: isCurrentUser
                        ? alpha(theme.palette.primary.main, 0.12)
                        : "transparent",
                      "& .MuiTableCell-root": {
                        py: { md: 1, lg: 1.1 },
                        fontSize: { md: "0.82rem", lg: "0.9rem" },
                      },
                    }}
                  >
                    <TableCell sx={{ width: 64 }}>{row.rank}</TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: 700 }}>{row.username}</Box>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 80 }}>
                      {row.points}
                    </TableCell>
                    {showRecord ? (
                      <TableCell align="right" sx={{ width: 96 }}>
                        {row.record}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ mt: 1.5 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontSize: "1rem", fontWeight: 700 }}
          >
            No standings yet
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, fontSize: "0.875rem", lineHeight: 1.4 }}
          >
            Leaderboard standings will appear after players complete their
            picks.
          </Typography>
        </Box>
      )}
    </Panel>
  );
};

export default LeaderboardCard;
