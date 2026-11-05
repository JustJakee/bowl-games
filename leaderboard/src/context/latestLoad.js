export const createLatestLoadGuard = () => {
  let latest = 0;
  return {
    start: () => ++latest,
    invalidate: () => {
      latest += 1;
    },
    isCurrent: (requestId) => requestId === latest,
  };
};
