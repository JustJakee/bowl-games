import { useMemo, useState } from "react";
import { Button, TextField } from "@mui/material";
import { useScoreboard } from "../context/NCAAFDataContext";
import PickMatchupCard from "../constants/PickMatchupCard";
import "../styles/pick-form.css";
import { uploadPicks } from "../utils/uploadPicks";
import mockGames from "../assets/mockBowls.json";

const PickForm = ({ onSubmitResult }) => {
  //const { games: scoreboardGames, loading, error } = useScoreboard();
  const [picks, setPicks] = useState({});
  const [entryName, setEntryName] = useState("");
  const [email, setEmail] = useState("");
  const [tieBreaker, setTieBreaker] = useState(0);

  // forcing mock data here
  const loading = false;
  const error = null;
  const scoreboardGames = mockGames;

  const games = useMemo(
    () =>
      scoreboardGames.map((game) => {
        const normalizeTeam = (team) => {
          const accent = team?.color || team?.alternateColor || "";
          const accentColor =
            accent && accent.startsWith("#")
              ? accent
              : accent
              ? `#${accent}`
              : "";

          return {
            id: team?.id,
            code: team?.abbr,
            nickname: team?.displayName,
            record: team?.rank,
            logoUrl: team?.logo,
            color: accentColor,
          };
        };

        return {
          id: game?.id,
          bowlName: game?.bowl || "Bowl Game Not Found", // TO DO REMOVE BEFORE BOWL SEASON
          kickoffText: game?.startTimeText || "",
          location: game?.location || "",
          network: game?.network || "",
          statusText: game?.statusText || "",
          isLive: game?.state === "in",
          awayTeam: normalizeTeam(game?.away),
          homeTeam: normalizeTeam(game?.home),
        };
      }),
    [scoreboardGames]
  );

  const handleSelect = (gameId, bowlName, teamCode) => {
    const bowlKey = bowlName?.trim() || "No Bowl Game";
    setPicks((prev) => ({
      ...prev,
      [gameId]: {
        ...(prev[gameId] || {}),
        [bowlKey]: teamCode,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = {
      name: entryName,
      email,
      picks: JSON.stringify(picks),
      tieBreaker: tieBreaker ? parseInt(tieBreaker, 10) : 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await uploadPicks(input);
      onSubmitResult?.({
        message: `Thanks ${input.name}, your picks were submitted!`,
        severity: "success",
      });
      return saved;
    } catch (err) {
      onSubmitResult?.({
        message: "Failed to submit picks. Please try again.",
        severity: "error",
      });
    }
  };

  if (loading) {
    return <div className="pick-form-container loading">Loading games...</div>;
  }

  if (error) {
    return (
      <div className="pick-form-container error" role="alert">
        {error}
      </div>
    );
  }

  const picksAreDisabled = false; // hard code disabled submit until season starts

  return (
    <form className="pick-form-container" onSubmit={handleSubmit}>
      <div className="pick-form-header">
        <div className="pick-form-field">
          <TextField
            label="Add a Name to Your Picks"
            placeholder="Name your entry"
            value={entryName}
            onChange={(event) => setEntryName(event.target.value)}
            size="small"
            fullWidth
          />
        </div>
        <div className="pick-form-field">
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            size="small"
            type="email"
            fullWidth
          />
        </div>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          className="pick-form-submit"
          size="medium"
          disabled={picksAreDisabled}
        >
          Submit Picks
        </Button>
      </div>
      {games.length === 0 && (
        <div className="empty-state">No bowl matchups available right now.</div>
      )}
      {games.map((game) => {
        const bowlKey = game?.bowlName?.trim() || "No Bowl Game";
        return (
          <PickMatchupCard
            key={game.id}
            {...game}
            selection={picks[game.id]?.[bowlKey]}
            onSelect={handleSelect}
            setTieBreaker={setTieBreaker}
            tieBreaker={tieBreaker}
          />
        );
      })}
    </form>
  );
};

export default PickForm;
