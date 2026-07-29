import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const LeaderboardHeader = ({ isLive, picksLocked, seasonYear }) => (
  <header className="leaderboard-page-header">
    <div>
      <h1>Leaderboard</h1>
      <div className="leaderboard-header-meta">
        {isLive ? (
          <p>Live standings for the {seasonYear || "2026"} Bowl Season.</p>
        ) : null}
        <span
          className={`leaderboard-status-chip ${
            isLive ? "leaderboard-status-chip--live" : ""
          }`}
        >
          {isLive ? "LIVE" : picksLocked ? "PICKS LOCKED" : "PICKS OPEN"}
        </span>
        {picksLocked ? (
          <span className="leaderboard-lock-copy">
            <LockOutlinedIcon aria-hidden="true" />
            Picks are locked
          </span>
        ) : null}
      </div>
    </div>
    <div className="leaderboard-season-pill" aria-label={`Season ${seasonYear || "2026"}`}>
      <CalendarMonthRoundedIcon aria-hidden="true" />
      <span>Season {seasonYear || "2026"}</span>
    </div>
  </header>
);

export default LeaderboardHeader;
