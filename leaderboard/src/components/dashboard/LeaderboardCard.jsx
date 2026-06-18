import {
  Box,
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

const LeaderboardCard = ({ rows, currentUsername }) => {
  const theme = useTheme();
  const showRecord = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <Panel>
      <SectionHeader title="Leaderboard" actionLabel="See Full Leaderboard" actionTo="/leaderboard" />
      <TableContainer sx={{ mt: 1.5 }}>
        <Table size="small" aria-label="Leaderboard preview">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Entry Name</TableCell>
              <TableCell align="right">Points</TableCell>
              {showRecord ? <TableCell align="right">Record</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isCurrentUser =
                row.username.toLowerCase() === (currentUsername || "").toLowerCase();

              return (
                <TableRow
                  key={`${row.rank}-${row.entryName}`}
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
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { md: "0.82rem", lg: "0.9rem" } }}>
                      {row.entryName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>{row.points}</TableCell>
                  {showRecord ? <TableCell align="right" sx={{ width: 96 }}>{row.record}</TableCell> : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Panel>
  );
};

export default LeaderboardCard;
