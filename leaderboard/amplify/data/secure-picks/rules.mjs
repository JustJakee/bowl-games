// Canonical app username comes from the player's stored, validated profile.
export const buildAutomaticEntryName = (profile, season) => {
  const username = String(profile?.username || "").trim();
  const key = String(profile?.usernameKey || "");
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(username) || key !== username.toLowerCase())
    throw new Error(
      "Your player profile needs a valid username before creating an entry.",
    );
  if (
    !Number.isInteger(season?.year) ||
    season.year < 1000 ||
    season.year > 9999
  )
    throw new Error("The selected season's year is unavailable.");
  return `${key}_picks_${season.year}`;
};

const timestamp = (value) => {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value))
    return NaN;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const getEffectivePickDeadline = ({ config, games }) => {
  const configured = timestamp(config?.picksLockAt);
  const firstKickoff = getFirstSeasonKickoff(games);
  if (!Number.isFinite(configured) || !Number.isFinite(firstKickoff))
    throw new Error("The season pick deadline is unavailable.");
  return Math.min(configured, firstKickoff);
};

export const assertSeasonOpenForPlayer = ({
  identity,
  entry,
  season,
  config,
  games,
  now,
}) => {
  const owner = identity?.sub;
  if (!owner) throw new Error("A signed-in player is required.");
  if (
    !identity?.groups?.includes("player") ||
    identity.groups.includes("admin")
  )
    throw new Error("Only player accounts can change picks or entries.");
  if (entry && (entry.isDeleted === true || entry.seasonId !== season?.id))
    throw new Error("The requested entry was not found.");
  if (entry && entry.owner !== owner)
    throw new Error("You cannot change another player's entry.");
  if (!season || season.isActive !== true || season.status !== "open")
    throw new Error("This season is not open for picks.");
  if (!config || config.seasonId !== season.id)
    throw new Error("The season pick deadline is unavailable.");
  const opensAt = timestamp(config.picksOpenAt);
  const deadline = getEffectivePickDeadline({ config, games });
  if (!Number.isFinite(opensAt) || now < opensAt)
    throw new Error("Picks are not open yet.");
  if (now >= deadline)
    throw new Error("All picks are locked because the first game has begun.");
  return { owner, seasonId: season.id };
};

export const assertCanSavePick = ({
  identity,
  entry,
  season,
  config,
  games,
  game,
  selectedTeam,
  now,
}) => {
  if (!entry) throw new Error("The requested entry was not found.");
  const { owner, seasonId } = assertSeasonOpenForPlayer({
    identity,
    entry,
    season,
    config,
    games,
    now,
  });
  if (
    !game ||
    game.seasonId !== season.id ||
    !games.some((candidate) => candidate.id === game.id)
  )
    throw new Error("The selected game does not belong to this season.");
  if (!pickableGames(games).some((candidate) => candidate.id === game.id))
    throw new Error("This game is not eligible for player picks.");
  if (game.status !== "scheduled")
    throw new Error("This game is no longer scheduled.");
  const selection = String(selectedTeam ?? "").trim();
  if (selection && ![game.teamAAbbr, game.teamBAbbr].includes(selection))
    throw new Error("The selected team does not belong to that game.");
  return { owner, seasonId, selection };
};

export const oneEntryId = (seasonId, owner, generation) =>
  `entry-${seasonId}-${owner}-${generation}`;

export const assertCanCreateEntry = (entries = []) => {
  if (entries.some((entry) => entry?.isDeleted !== true))
    throw new Error("You already have an entry for this season.");
};

export const pickableGames = (games = []) =>
  games.filter(
    (game) =>
      game?.id &&
      game?.bowlName?.trim() &&
      !game.bowlName.includes("FCS Championship"),
  );

export const hasGameStarted = (game, now) => timestamp(game?.kickoffAt) <= now;

export const getFirstSeasonKickoff = (games = []) => {
  const kickoffs = games
    .map((game) => timestamp(game?.kickoffAt))
    .filter(Number.isFinite);
  return kickoffs.length ? Math.min(...kickoffs) : NaN;
};

export const buildVisibleSeasonPicks = ({
  entries = [],
  picks = [],
  games = [],
  config,
  identity,
  now,
}) => {
  const owner = identity?.sub;
  if (!owner) throw new Error("A signed-in player is required.");
  const firstKickoff = getFirstSeasonKickoff(games);
  const seasonStarted = Number.isFinite(firstKickoff) && now >= firstKickoff;
  const gameById = new Map(games.map((game) => [game.id, game]));
  const requiredIds = pickableGames(games).map((game) => game.id);
  const picksByEntry = new Map();
  for (const pick of picks) {
    if (!pick?.entryId || !gameById.has(pick.gameId)) continue;
    const group = picksByEntry.get(pick.entryId) || new Map();
    if (pick.selectedTeam) group.set(pick.gameId, pick.selectedTeam);
    picksByEntry.set(pick.entryId, group);
  }
  const activeEntries = entries.filter(
    (entry) => entry && entry.isDeleted !== true,
  );
  const activeEntryIds = new Set(activeEntries.map((entry) => entry.id));
  const entryOwnerById = new Map(
    activeEntries.map((entry) => [entry.id, entry.owner]),
  );
  const submittedByGame = new Map();
  for (const pick of picks) {
    if (
      !pick?.selectedTeam ||
      !gameById.has(pick.gameId) ||
      !activeEntryIds.has(pick.entryId)
    )
      continue;
    const submitted = submittedByGame.get(pick.gameId) || new Set();
    submitted.add(pick.entryId);
    submittedByGame.set(pick.gameId, submitted);
  }
  const completeEntryIds = activeEntries
    .filter((entry) => {
      const selections = picksByEntry.get(entry.id) || new Map();
      return (
        requiredIds.length > 0 &&
        requiredIds.every((id) => selections.has(id)) &&
        (!config?.tieBreakerRequired ||
          entry.tieBreakerValue === 0 ||
          Number.isInteger(entry.tieBreakerValue))
      );
    })
    .map((entry) => entry.id);
  const championship = games.find(
    (game) =>
      game.bowlName ===
      "College Football Playoff National Championship Presented by AT&T",
  );
  const revealTiebreakers = championship && hasGameStarted(championship, now);
  return {
    picks: picks
      .filter((pick) => {
        const game = gameById.get(pick.gameId);
        return (
          game &&
          activeEntryIds.has(pick.entryId) &&
          (entryOwnerById.get(pick.entryId) === owner || seasonStarted)
        );
      })
      .map(
        ({
          id,
          seasonId,
          entryId,
          gameId,
          selectedTeam,
          createdAt,
          updatedAt,
        }) => ({
          id,
          seasonId,
          entryId,
          gameId,
          selectedTeam,
          createdAt,
          updatedAt,
        }),
      ),
    completeEntryIds,
    submissionCounts: [...submittedByGame].map(([gameId, ids]) => ({
      gameId,
      count: ids.size,
    })),
    tieBreakers: activeEntries
      .filter((entry) => entry.owner === owner || revealTiebreakers)
      .map((entry) => ({
        entryId: entry.id,
        value: entry.tieBreakerValue ?? null,
      })),
  };
};
