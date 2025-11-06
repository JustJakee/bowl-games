import { useMemo, useState } from "react";
import { useScoreboard } from "../context/NCAAFDataContext";
import PickMatchupCard from "../constants/PickMatchupCard";
import "../styles/pick-form.css";

const PickForm = () => {
  const { games: scoreboardGames, loading, error } = useScoreboard();
  const [picks, setPicks] = useState({}); // picks object that we will send to db 

  const games = useMemo(
    () =>
      scoreboardGames.map((game) => {
        const normalizeTeam = (team) => {
          const accent = team?.color || team?.alternateColor || "";
          const accentColor =
            accent && accent.startsWith("#") ? accent : accent ? `#${accent}` : "";

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

  return (
    <div className="pick-form-container">
      {games.length === 0 && (
        <div className="empty-state">No bowl matchups available right now.</div>
      )}
      {games.map((game) => (
        <PickMatchupCard
          key={game.id}
          {...game}
          selection={picks[game.id]}
          onSelect={handleSelect}
        />
      ))}
    {/* DONT FORGET WE NEED TIE BREAKER */}
    </div>
  );
};

export default PickForm;
