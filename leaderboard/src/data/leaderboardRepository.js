// DATA — LEADERBOARD — AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";

const ENTRY_LEADERBOARD_SELECTION = [
  "id",
  "seasonId",
  "owner",
  "entryName",
  "tieBreakerValue",
  "isDeleted",
];

const PICK_LEADERBOARD_SELECTION = [
  "id",
  "seasonId",
  "entryId",
  "gameId",
  "selectedTeam",
];

const PROFILE_SELECTION = ["id", "owner", "username"];

const getDataClient = () => {
  return configuredDataClient;
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

export const loadSeasonLeaderboardData = async ({ seasonId }) => {
  if (!seasonId) {
    return {
      entries: [],
      picks: [],
      usernamesByOwner: {},
    };
  }

  const client = getDataClient();
  const [entriesResult, picksResult, profilesResult] = await Promise.all([
    client.models.Entry.list({
      filter: {
        seasonId: { eq: seasonId },
        isDeleted: { eq: false },
      },
      selectionSet: ENTRY_LEADERBOARD_SELECTION,
      authMode: "userPool",
    }),
    client.models.Pick.list({
      filter: {
        seasonId: { eq: seasonId },
      },
      selectionSet: PICK_LEADERBOARD_SELECTION,
      authMode: "userPool",
    }),
    client.models.UserProfile.list({
      selectionSet: PROFILE_SELECTION,
      authMode: "userPool",
    }),
  ]);

  throwIfGraphQLError(entriesResult, "Unable to load leaderboard entries.");
  throwIfGraphQLError(picksResult, "Unable to load leaderboard picks.");
  throwIfGraphQLError(profilesResult, "Unable to load leaderboard profiles.");

  const usernamesByOwner = (profilesResult.data || []).reduce(
    (accumulator, profile) => {
      if (profile?.owner && profile?.username) {
        accumulator[profile.owner] = profile.username;
      }

      return accumulator;
    },
    {},
  );

  return {
    entries: (entriesResult.data || []).filter(Boolean),
    picks: (picksResult.data || []).filter(Boolean),
    usernamesByOwner,
  };
};
