import { useMemo, useState } from "react";
import { Button, TextField } from "@mui/material";
import { useScoreboard } from "../context/NCAAFDataContext";
import PickMatchupCard from "../constants/PickMatchupCard";
import { generateClient } from "aws-amplify/api";
import { createSubmission } from "../graphql/mutations";
import "../styles/pick-form.css";

const PickForm = () => {
  const { games: scoreboardGames, loading, error } = useScoreboard();
  const [picks, setPicks] = useState({}); // picks object that we will send to db
  const [entryName, setEntryName] = useState("");
  const [email, setEmail] = useState("");
  const [tieBreaker, setTieBreaker] = useState(0);

  const client = generateClient();

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

  const handleSelect = (gameId, teamCode) => {
    setPicks((prev) => ({
      ...prev,
      [gameId]: teamCode,
    }));
  };

  const handleSubmit = async () => {
    const input = {
      name: entryName,
      email: email,
      picks: picks,
      tieBreaker: tieBreaker ? parseInt(tieBreaker, 10) : null,
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await client.graphql({
        query: createSubmission,
        variables: { input },
      });

      console.log("Submission created:", result.data.createSubmission);

      alert("Submitted!");
      // TODO: clear form fields if needed
    } catch (error) {
      console.error("Error submitting:", error);
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
      {games.map((game) => (
        <PickMatchupCard
          key={game.id}
          {...game}
          selection={picks[game.id]}
          onSelect={handleSelect}
          setTieBreaker={setTieBreaker}
          tieBreaker={tieBreaker}
        />
      ))}
    </form>
  );
};

export default PickForm;
