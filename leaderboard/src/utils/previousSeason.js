export const choosePreviousSeason = (seasons, currentSeason) =>
  (seasons || [])
    .filter((season) => season?.id !== currentSeason?.id && season?.year < currentSeason?.year && ["complete", "archived"].includes(season.status))
    .sort((left, right) => right.year - left.year)[0] || null;
