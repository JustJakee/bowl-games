import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { formatPrize } from "./leaderboardPrizes";

const LeaderboardPrizeTag = ({ amountCents, compact = false }) => {
  if (!Number.isSafeInteger(amountCents)) return null;

  return (
    <span className={`leaderboard-prize-tag${compact ? " compact" : ""}`}>
      <EmojiEventsRoundedIcon aria-hidden="true" />
      <span>{formatPrize(amountCents)}</span>
    </span>
  );
};

export default LeaderboardPrizeTag;
