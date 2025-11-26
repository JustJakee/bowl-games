import { useMemo } from "react";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { Table as AntTable, Tag, Divider } from "antd";
import teamNamesDict from "../constants/teamNames";
import "../styles/all-picks.css";
import "antd/dist/reset.css";

const pickStatus = (winner, pick) => {
  if (!winner) return "pending";
  const winnerCode = teamNamesDict[winner] || winner;
  if (!pick || pick === "-") return "pending";
  return winnerCode === pick ? "correct" : "incorrect";
};

const statusLabel = {
  correct: "Correct",
  incorrect: "Incorrect",
  pending: "Pending",
};

const AllPicks = ({ playerPicks = [], matchups = [], loading = false }) => {
  const hasData = playerPicks.length > 0 && matchups.length > 0;

  const dataSource = useMemo(
    () =>
      playerPicks.map((player, playerIdx) => ({
        key: player.name || `player-${playerIdx}`,
        player: player.name,
        picks: matchups.map((game, gameIdx) => ({
          bowlId: game?.id || `game-${gameIdx}`,
          pick: player.picks?.[gameIdx] || "-",
          winner: game?.winner,
          title: game?.game || "Bowl Game",
        })),
      })),
    [playerPicks, matchups]
  );

  const columns = useMemo(() => {
    const bowlColumns = matchups.map((game, idx) => ({
      title: game?.game || "Bowl Game",
      dataIndex: "picks",
      key: game?.id || `game-${idx}`,
      width: 140,
      render: (_, record) => {
        const pick = record.picks?.[idx];
        const status = pickStatus(pick?.winner, pick?.pick);
        return (
          <Tag className={`all-picks__tag all-picks__tag--${status}`}>
            {pick?.pick || "-"}
          </Tag>
        );
      },
    }));

    return [
      {
        title: "Player",
        dataIndex: "player",
        key: "player",
        fixed: "left",
        width: 180,
        className: "all-picks__col-player",
      },
      ...bowlColumns,
    ];
  }, [matchups]);

  if (loading) {
    return (
      <div className="all-picks all-picks--loading">
        <CircularProgress size={22} />
        <Typography variant="body2">Loading picks…</Typography>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="all-picks all-picks--empty">
        <Typography variant="body2">No picks available yet.</Typography>
      </div>
    );
  }

  return (
    <div className="all-picks">
      <Box className="all-picks__header">
        <Typography variant="h6" fontWeight={800}>
          All Picks
        </Typography>
      </Box>

      {/* Desktop / tablet table (Ant Design) */}
      <AntTable
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="medium"
        sticky
        scroll={{ x: "max-content", y: 520 }}
      />

      {/* Mobile cards */}
      <div className="all-picks__mobile">
        {dataSource.map((row, idx) => (
          <div className="all-picks__card" key={`${row.player}-m-${idx}`}>
            <div className="all-picks__card-header">
              <div className="all-picks__player-name">{row.player}'s Picks</div>
              <Divider
                size="small"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div className="all-picks__card-body">
              {row.picks.map((pick) => {
                const status = pickStatus(pick.winner, pick.pick);
                return (
                  <div
                    className="all-picks__pick-row"
                    key={`${pick.bowlId}-${row.player}-m`}
                  >
                    <div className="all-picks__game-title">{pick.title}</div>
                    <Chip
                      size="small"
                      label={pick.pick}
                      className={`all-picks__chip all-picks__chip--${status}`}
                      variant="outlined"
                      aria-label={`${row.player} pick ${pick.pick} (${statusLabel[status]})`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllPicks;
