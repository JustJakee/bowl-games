import ScoreBug from "../constants/ScoreBug";
import { useScoreboard } from "../context/NCAAFDataContext";
import "../styles/schedule-view.css";

const ScheduleView = () => {
  const { games: scoreboardGames, loading, error } = useScoreboard();

  const bowlGames = scoreboardGames.map((game) => ({
    awayTeam: { code: game?.away?.abbr, logoUrl: game?.away?.logo },
    homeTeam: { code: game?.home?.abbr, logoUrl: game?.home?.logo },
    awayScore: game?.away?.score,
    homeScore: game?.home?.score,
    statusLine: game?.statusText,
    bowlGame: game?.bowl,
    network: game?.network,
    isLive: game.state === "in",
    gameId: game.id,
  }));

  if (loading) {
    return <div className="schedule-container loading">Loading games...</div>;
  }

  if (error) {
    return (
      <div className="schedule-container error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {bowlGames.length === 0 && (
        <div className="empty-state">No games scheduled right now.</div>
      )}
      {bowlGames.map((game, index) => (
        <ScoreBug
          key={`${game.awayTeam?.code}-${game.homeTeam?.code}-${index}`}
          {...game}
        />
      ))}
    </div>
  );
};

export default ScheduleView;
