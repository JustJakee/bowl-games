// DATA - SCHEDULE PICKS - AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { buildGamePickSplitView } from "../utils/gamePickSplits";
import { selectCanonicalEntriesByUser } from "./canonicalEntry";

let dataClientOverride = null;

const ENTRY_PUBLIC_SELECTION = [
  "id",
  "seasonId",
  "entryName",
  "isDeleted",
  "createdAt",
  "updatedAt",
  "userProfile.id",
  "userProfile.username",
];

export const __setGamePickSplitsDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
};

const getDataClient = () => dataClientOverride || configuredDataClient;

const getFirstGraphQLError = (result) => result?.errors?.[0]?.message || null;

const throwIfGraphQLError = (result, fallbackMessage) => {
  const errorMessage = getFirstGraphQLError(result);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (!result) {
    throw new Error(fallbackMessage);
  }
};

const listAllModelItems = async (listFn, input, fallbackMessage) => {
  const items = [];
  let nextToken;

  do {
    const result = await listFn({
      ...input,
      nextToken,
    });

    throwIfGraphQLError(result, fallbackMessage);
    items.push(...(result.data || []).filter(Boolean));
    nextToken = result.nextToken || null;
  } while (nextToken);

  return items;
};

const sortEntriesByName = (entries) =>
  (entries || [])
    .slice()
    .sort((left, right) =>
      String(left?.entryName || "").localeCompare(
        String(right?.entryName || ""),
        undefined,
        { sensitivity: "base" },
      ),
    );

export const loadGamePickSplitViews = async ({
  seasonId,
  games = [],
  currentEntries = [],
  owner,
  now = Date.now(),
}) => {
  if (!seasonId || games.length === 0) {
    return {};
  }

  const client = getDataClient();
  const currentEntryIds = currentEntries
    .map((entry) => entry.id)
    .filter(Boolean);
  const [entries, visibleResult] = await Promise.all([
    listAllModelItems(
      client.models.Entry.list,
      {
        filter: {
          seasonId: { eq: seasonId },
        },
        selectionSet: ENTRY_PUBLIC_SELECTION,
        authMode: "userPool",
      },
      "Unable to load entries for pick splits.",
    ),
    client.queries.visibleSeasonPicks({ seasonId }, { authMode: "userPool" }),
  ]);
  throwIfGraphQLError(visibleResult, "Unable to load visible picks for games.");
  if (!visibleResult.data)
    throw new Error("Unable to load visible picks for games.");
  const visiblePicks = (visibleResult.data.picks || []).filter(Boolean);
  const submissionCounts = new Map(
    (visibleResult.data.submissionCounts || []).map((item) => [
      item.gameId,
      item.count,
    ]),
  );
  const activeEntries = sortEntriesByName(
    selectCanonicalEntriesByUser({ entries, picks: visiblePicks, seasonId }),
  );
  const canonicalEntryIds = new Set(activeEntries.map((entry) => entry.id));
  const canonicalVisiblePicks = visiblePicks.filter((pick) =>
    canonicalEntryIds.has(pick.entryId),
  );

  return games.reduce((accumulator, game) => {
    accumulator[game.id] = buildGamePickSplitView({
      game,
      entries: activeEntries,
      submittedPicks: canonicalVisiblePicks,
      submittedCount: submissionCounts.get(game.id) ?? 0,
      revealedPicks: canonicalVisiblePicks,
      ownedPicks: canonicalVisiblePicks.filter((pick) =>
        currentEntryIds.includes(pick.entryId),
      ),
      currentEntryIds,
      now,
    });
    return accumulator;
  }, {});
};
