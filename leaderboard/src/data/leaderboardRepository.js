// DATA — LEADERBOARD — AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { selectCanonicalEntriesByUser } from "./canonicalEntry";

const LEADERBOARD_PAGE_LIMIT = 100;

const ENTRY_LEADERBOARD_SELECTION = [
  "id",
  "seasonId",
  "entryName",
  "isDeleted",
  "createdAt",
  "updatedAt",
  "userProfile.id",
  "userProfile.username",
];

let dataClientOverride = null;

const getDataClient = () => {
  return dataClientOverride || configuredDataClient;
};

export const __setLeaderboardRepositoryDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
};

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

const listAllPages = async ({ listPage, input, fallbackMessage }) => {
  const items = [];
  let nextToken;

  do {
    const result = await listPage({
      ...input,
      limit: LEADERBOARD_PAGE_LIMIT,
      nextToken,
    });

    throwIfGraphQLError(result, fallbackMessage);
    items.push(...(result.data || []).filter(Boolean));
    nextToken = result.nextToken || null;
  } while (nextToken);

  return items;
};

export const loadSeasonLeaderboardData = async ({ seasonId }) => {
  if (!seasonId) {
    return {
      entries: [],
      picks: [],
      usernamesByOwner: {},
    };
  }

  const client = getDataClient();
  const [entries, visibleResult] = await Promise.all([
    listAllPages({
      listPage: (input) => client.models.Entry.list(input),
      input: {
        filter: {
          seasonId: { eq: seasonId },
        },
        selectionSet: ENTRY_LEADERBOARD_SELECTION,
        authMode: "userPool",
      },
      fallbackMessage: "Unable to load leaderboard entries.",
    }),
    client.queries.visibleSeasonPicks({ seasonId }, { authMode: "userPool" }),
  ]);
  throwIfGraphQLError(
    visibleResult,
    "Unable to load visible leaderboard picks.",
  );
  if (!visibleResult.data)
    throw new Error("Unable to load visible leaderboard picks.");
  const picks = (visibleResult.data?.picks || []).filter(Boolean);
  const completedIds = new Set(visibleResult.data?.completeEntryIds || []);
  const tieBreakers = new Map(
    (visibleResult.data?.tieBreakers || []).map((item) => [
      item.entryId,
      item.value,
    ]),
  );

  const canonicalEntries = selectCanonicalEntriesByUser({
    entries,
    picks,
    seasonId,
  });
  const canonicalEntryIds = new Set(canonicalEntries.map((entry) => entry.id));

  return {
    entries: canonicalEntries.map((entry) => ({
      ...entry,
      tieBreakerValue: tieBreakers.get(entry.id) ?? null,
    })),
    picks: picks.filter((pick) => canonicalEntryIds.has(pick.entryId)),
    completeEntryIds: [...completedIds].filter((id) =>
      canonicalEntryIds.has(id),
    ),
    usernamesByOwner: {},
  };
};
