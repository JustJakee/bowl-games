import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { selectCanonicalEntriesByUser } from "./canonicalEntry";

const ENTRY_FIELDS = [
  "id",
  "seasonId",
  "entryName",
  "paymentStatus",
  "isDeleted",
  "createdAt",
  "updatedAt",
  "userProfile.id",
  "userProfile.username",
  "userProfile.email",
];

const PICK_FIELDS = [
  "id",
  "entryId",
  "seasonId",
  "gameId",
  "selectedTeam",
  "createdAt",
  "updatedAt",
];

let dataClientOverride = null;

const getDataClient = () => dataClientOverride || configuredDataClient;

export const __setAdminEntriesDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
};

const listAll = async (model, input) => {
  const items = [];
  let nextToken;

  do {
    const result = await model.list({ ...input, nextToken });
    if (result.errors?.[0]) throw new Error(result.errors[0].message);
    items.push(...(result.data || []));
    nextToken = result.nextToken;
  } while (nextToken);

  return items.filter(Boolean);
};

export const loadAdminEntries = async ({ seasonId, requiredGameIds = [] }) => {
  if (!seasonId) return [];

  const client = getDataClient();
  const [entries, picks] = await Promise.all([
    listAll(client.models.Entry, {
      filter: { seasonId: { eq: seasonId } },
      selectionSet: ENTRY_FIELDS,
      authMode: "userPool",
    }),
    listAll(client.models.Pick, {
      filter: { seasonId: { eq: seasonId } },
      selectionSet: PICK_FIELDS,
      authMode: "userPool",
    }),
  ]);

  // Keep the administration view aligned with the entries used by the leaderboard.
  const activeEntries = selectCanonicalEntriesByUser({ entries, picks, seasonId });
  const validGames = new Set(requiredGameIds);

  return activeEntries.map((entry) => {
    const completedGameIds = new Set(
      picks
        .filter(
          (pick) =>
            pick.entryId === entry.id &&
            validGames.has(pick.gameId) &&
            pick.selectedTeam,
        )
        .map((pick) => pick.gameId),
    );

    return {
      ...entry,
      playerName: entry.userProfile?.username || "Unknown player",
      playerEmail: entry.userProfile?.email || "Email unavailable",
      completedPicks: completedGameIds.size,
      totalPicks: requiredGameIds.length,
    };
  });
};

export const updateAdminEntryPayment = async ({ entryId, paymentStatus }) => {
  const result = await getDataClient().models.Entry.update(
    { id: entryId, paymentStatus },
    { selectionSet: ENTRY_FIELDS, authMode: "userPool" },
  );
  if (result.errors?.[0]) throw new Error(result.errors[0].message);
  return result.data;
};
