export const buildClearProgress = ({ completed = 0, total = 0 } = {}) => {
  const safeTotal = Math.max(0, Math.trunc(Number(total) || 0));
  const safeCompleted = Math.min(
    safeTotal,
    Math.max(0, Math.trunc(Number(completed) || 0)),
  );
  const rawPercentage = safeTotal
    ? (safeCompleted / safeTotal) * 100
    : 0;
  const percentage =
    safeTotal > 0 && safeCompleted === safeTotal
      ? 100
      : Math.min(99, Math.round(rawPercentage));

  return {
    completed: safeCompleted,
    total: safeTotal,
    percentage,
  };
};
