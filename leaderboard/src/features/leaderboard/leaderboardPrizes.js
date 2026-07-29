export const LEADERBOARD_PRIZES = {
  first: 500,
  second: 300,
  third: 150,
  fourth: 100,
};

export const getPrizeForRank = (rank) => {
  if (rank === 1) return LEADERBOARD_PRIZES.first;
  if (rank === 2) return LEADERBOARD_PRIZES.second;
  if (rank === 3) return LEADERBOARD_PRIZES.third;
  if (rank === 4) return LEADERBOARD_PRIZES.fourth;
  return null;
};

export const formatPrize = (amount) => {
  if (!Number.isFinite(amount)) return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};
