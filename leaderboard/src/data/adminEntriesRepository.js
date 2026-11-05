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
  const activeEntries = selectCanonicalEntriesByUser({
    entries,
    picks,
    seasonId,
  });
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
  const client = getDataClient();
  const selectionSet = ["id", "paymentStatus"];
  let result;
  try {
    result = await client.models.Entry.update(
      { id: entryId, paymentStatus },
      { selectionSet, authMode: "userPool" },
    );
  } catch (error) {
    result = { errors: [error] };
  }
  if (
    !result?.errors?.length &&
    result?.data?.id === entryId &&
    result.data.paymentStatus === paymentStatus
  ) return result.data;

  // A relationship field can fail after the write. Resolve an ambiguous
  // response against the stored record before reporting the mutation as failed.
  try {
    const persisted = await client.models.Entry.get(
      { id: entryId },
      { selectionSet, authMode: "userPool" },
    );
    if (
      !persisted.errors?.length &&
      persisted.data?.id === entryId &&
      persisted.data.paymentStatus === paymentStatus
    ) return persisted.data;
  } catch {
    // The result is still unconfirmed; retain the original failure below.
  }
  const reason = result?.errors?.[0]?.message;
  throw new Error(
    `The payment update could not be confirmed. Refresh to check its status.${reason ? ` ${reason}` : ""}`,
  );
};
