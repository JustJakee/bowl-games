import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { formatPrize } from "./leaderboardPrizes";

const LeaderboardPrizeTag = ({ amount, compact = false }) => {
  if (!Number.isFinite(amount)) return null;

  return (
    <span className={`leaderboard-prize-tag${compact ? " compact" : ""}`}>
      <EmojiEventsRoundedIcon aria-hidden="true" />
      <span>{formatPrize(amount)}</span>
    </span>
  );
};

export default LeaderboardPrizeTag;
