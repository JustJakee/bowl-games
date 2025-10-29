import "../assets/styles.css";
import teamNamesDict from "../constants/teamNames";

const HeaderRow = ({ playerPicks }) => (
  <thead>
    <tr>
      <th style={{ padding: "15px", minWidth: "140px" }}>Matchup</th>
      {playerPicks.map((player) => (
        <th key={player.name} style={{ padding: "15px", minWidth: "120px" }}>
          {player.name}
        </th>
      ))}
    </tr>
  </thead>
);

const pickStatus = (winner, pick) => {
  if (winner === undefined || winner === "") return "no-winner";
  return teamNamesDict[winner] === pick ? "correct" : "incorrect";
};

const PickCell = ({ status, label }) => (
  <td className={status}>
    {label}{" "}
    {status === "correct" && (
      <span className="text-success" aria-label="correct" title="Correct">
        �o"
      </span>
    )}
    {status === "incorrect" && (
      <span className="text-danger" aria-label="incorrect" title="Incorrect">
        �o-
      </span>
    )}
  </td>
);

const FullView = ({ playerPicks, matchups }) => {
  const hasData =
    playerPicks && playerPicks.length > 0 && matchups && matchups.length > 0;

  if (!hasData) {
    return (
      <div className="full-view-table-container">
        <div>Loading picks and matchups�?�</div>
      </div>
    );
  }

  return (
    <div>
      <div className="full-view-table-container">
        <table className="full-view-table">
          <HeaderRow playerPicks={playerPicks} />
          <tbody>
            {playerPicks[0].picks.slice(0, 40).map((_, gameIndex) => (
              <tr key={gameIndex}>
                <td>{matchups[gameIndex]?.game}</td>
                {playerPicks.map((player) => {
                  const pick = player.picks[gameIndex];
                  const status = pickStatus(matchups[gameIndex]?.winner, pick);
                  return (
                    <PickCell key={player.name} status={status} label={pick} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FullView;

