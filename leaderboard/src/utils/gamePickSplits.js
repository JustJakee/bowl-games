// UTIL - SCHEDULE PICKS - VISIBILITY AND AGGREGATION
export const UNKNOWN_TEAM_KEY = "__unknown__";

export const normalizeTeamKey = (value) => String(value || "").trim();

export const getGameTeams = (game) => [
  {
    side: "away",
    key: normalizeTeamKey(game?.away?.abbr),
    abbr: game?.away?.abbr || "",
    name: game?.away?.displayName || game?.away?.abbr || "Away",
    logo: game?.away?.logo || "",
  },
  {
    side: "home",
    key: normalizeTeamKey(game?.home?.abbr),
    abbr: game?.home?.abbr || "",
    name: game?.home?.displayName || game?.home?.abbr || "Home",
    logo: game?.home?.logo || "",
  },
];

export const isGamePickLocked = (game, now = Date.now()) => {
  if (game?.state === "in" || game?.state === "post" || game?.isFinal) {
    return true;
  }

  const kickoff = game?.startDate ? new Date(game.startDate).getTime() : NaN;
  return Number.isFinite(kickoff) && kickoff <= now;
};

export const getGamePickActionState = (pickSplit) => {
  const enabled = Boolean(pickSplit?.isLocked);

  return {
    enabled,
    label: enabled
      ? "View Game Picks"
      : "View Game Picks (Available After Kick-Off)",
  };
};

const uniqueValidGamePicks = ({ picks = [], gameId, activeEntryIds }) => {
  const seen = new Set();

  return (picks || []).filter((pick) => {
    if (!pick?.entryId || !pick?.gameId || pick.gameId !== gameId) {
      return false;
    }

    if (activeEntryIds.size > 0 && !activeEntryIds.has(pick.entryId)) {
      return false;
    }

    const key = `${pick.entryId}:${pick.gameId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const sortEntryPicks = (left, right) => {
  if (left.isOwned !== right.isOwned) {
    return left.isOwned ? -1 : 1;
  }

  return left.entryName.localeCompare(right.entryName, undefined, {
    sensitivity: "base",
  });
};

export const buildGamePickSplitView = ({
  game,
  entries = [],
  submittedPicks = [],
  revealedPicks = [],
  ownedPicks = [],
  currentEntryIds = [],
  now = Date.now(),
}) => {
  const activeEntries = (entries || []).filter((entry) => !entry?.isDeleted);
  const activeEntryIds = new Set(activeEntries.map((entry) => entry.id));
  const entriesById = new Map(activeEntries.map((entry) => [entry.id, entry]));
  const ownedEntryIdSet = new Set(currentEntryIds.filter(Boolean));
  const teams = getGameTeams(game);
  const teamKeySet = new Set(teams.map((team) => team.key).filter(Boolean));
  const teamsByKey = new Map(teams.map((team) => [team.key, team]));
  const locked = isGamePickLocked(game, now);
  const validSubmittedPicks = uniqueValidGamePicks({
    picks: submittedPicks,
    gameId: game?.id,
    activeEntryIds,
  });
  const validOwnedPicks = uniqueValidGamePicks({
    picks: ownedPicks,
    gameId: game?.id,
    activeEntryIds,
  }).filter((pick) => ownedEntryIdSet.has(pick.entryId));
  const validRevealedPicks = locked
    ? uniqueValidGamePicks({
        picks: revealedPicks,
        gameId: game?.id,
        activeEntryIds,
      }).filter((pick) => teamKeySet.has(normalizeTeamKey(pick.selectedTeam)))
    : [];
  const revealedTotal = validRevealedPicks.length;
  const ownedPicksByTeam = validOwnedPicks.reduce((accumulator, pick) => {
    const teamKey = normalizeTeamKey(pick.selectedTeam);
    if (!teamKey) return accumulator;

    if (!accumulator[teamKey]) {
      accumulator[teamKey] = [];
    }

    const entry = entriesById.get(pick.entryId);
    const team = teamsByKey.get(teamKey);
    accumulator[teamKey].push({
      entryId: pick.entryId,
      entryName: entry?.entryName || "Unnamed Entry",
      selectedTeam: teamKey,
      selectedTeamName: team?.name || teamKey,
      selectedTeamLogo: team?.logo || "",
      isOwned: true,
    });
    return accumulator;
  }, {});
  const revealedEntriesByTeam = validRevealedPicks.reduce((accumulator, pick) => {
    const teamKey = normalizeTeamKey(pick.selectedTeam);
    const entry = entriesById.get(pick.entryId);

    if (!accumulator[teamKey]) {
      accumulator[teamKey] = [];
    }

    accumulator[teamKey].push({
      entryId: pick.entryId,
      entryName: entry?.entryName || "Unnamed Entry",
      selectedTeam: teamKey,
      isOwned: ownedEntryIdSet.has(pick.entryId),
    });
    return accumulator;
  }, {});

  const teamSplits = teams.map((team) => {
    const revealedEntries = (revealedEntriesByTeam[team.key] || []).sort(
      sortEntryPicks,
    );
    const count = revealedEntries.length;
    const percentage =
      revealedTotal > 0 ? Math.round((count / revealedTotal) * 100) : 0;
    const ownedEntries = (locked
      ? revealedEntries.filter((entryPick) => entryPick.isOwned)
      : ownedPicksByTeam[team.key] || []
    ).sort(sortEntryPicks);

    return {
      ...team,
      count,
      percentage,
      ownedCount: ownedEntries.length,
      ownedEntries,
      entries: revealedEntries,
    };
  });
  const unsubmittedCount = Math.max(
    activeEntries.length - validSubmittedPicks.length,
    0,
  );

  return {
    gameId: game?.id || "",
    isLocked: locked,
    totalEligibleEntries: activeEntries.length,
    totalSubmittedPicks: validSubmittedPicks.length,
    totalRevealedPicks: revealedTotal,
    unsubmittedCount,
    teamSplits,
    ownedPicks: validOwnedPicks.map((pick) => {
      const entry = entriesById.get(pick.entryId);
      const teamKey = normalizeTeamKey(pick.selectedTeam);
      const team = teamsByKey.get(teamKey);
      return {
        entryId: pick.entryId,
        entryName: entry?.entryName || "Unnamed Entry",
        selectedTeam: teamKey,
        selectedTeamName: team?.name || teamKey,
        selectedTeamLogo: team?.logo || "",
        isOwned: true,
      };
    }).sort(sortEntryPicks),
    hasInvalidRevealedPicks:
      locked &&
      uniqueValidGamePicks({
        picks: revealedPicks,
        gameId: game?.id,
        activeEntryIds,
      }).some((pick) => !teamKeySet.has(normalizeTeamKey(pick.selectedTeam))),
  };
};
