// DATA — LEADERBOARD — AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";

const LEADERBOARD_PAGE_LIMIT = 100;

const ENTRY_LEADERBOARD_SELECTION = [
  "id",
  "seasonId",
  "entryName",
  "tieBreakerValue",
  "isDeleted",
  "userProfile.username",
];

const PICK_LEADERBOARD_SELECTION = [
  "id",
  "seasonId",
  "entryId",
  "gameId",
  "selectedTeam",
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
  const [entries, picks] = await Promise.all([
    listAllPages({
      listPage: (input) => client.models.Entry.list(input),
      input: {
        filter: {
          seasonId: { eq: seasonId },
          isDeleted: { eq: false },
        },
        selectionSet: ENTRY_LEADERBOARD_SELECTION,
        authMode: "userPool",
      },
      fallbackMessage: "Unable to load leaderboard entries.",
    }),
    listAllPages({
      listPage: (input) => client.models.Pick.list(input),
      input: {
        filter: {
          seasonId: { eq: seasonId },
        },
        selectionSet: PICK_LEADERBOARD_SELECTION,
        authMode: "userPool",
      },
      fallbackMessage: "Unable to load leaderboard picks.",
    }),
  ]);

  return {
    entries,
    picks,
    usernamesByOwner: {},
  };
};
