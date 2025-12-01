import { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Table as AntTable, Tag } from "antd";
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
        <Typography variant="body2">Loading picks...</Typography>
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

      {/* Desktop table */}
      <AntTable
        className="all-picks__desktop-table"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="medium"
        sticky
        scroll={{ x: "max-content", y: 520 }}
      />

      {/* Mobile table */}
      <div className="all-picks__mobile">
        <AntTable
          className="all-picks__mobile-table"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          tableLayout="fixed"
          sticky
          scroll={{ x: "max-content", y: 560 }}
          locale={{ emptyText: "No picks submitted" }}
        />
      </div>
    </div>
  );
};

export default AllPicks;
