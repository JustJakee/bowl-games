import { Typography } from "@mui/material";
import { useScoreboard } from "../context/NCAAFDataContext";
import "../styles/pick-form.css";

const PickForm = () => {
  const { games: scoreboardGames } = useScoreboard();

  const bowlGames = scoreboardGames.map((game) => ({
    awayTeam: { code: game?.away?.abbr, logoUrl: game?.away?.logo },
    homeTeam: { code: game?.home?.abbr, logoUrl: game?.home?.logo },
    awayScore: game?.away?.score,
    homeScore: game?.home?.score,
    statusLine: game?.statusText,
    bowlGame: game?.bowl,
    network: game?.network,
    isLive: game.state === "in",
  }));

  return (
    <div className="pick-form-container">
        <Typography>Pick Form Coming Soon...</Typography>
    </div>
  );
};

export default PickForm;