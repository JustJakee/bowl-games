// DATA - SCHEDULE PICKS - AMPLIFY DATA
import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import {
  buildGamePickSplitView,
  isGamePickLocked,
} from "../utils/gamePickSplits";

let dataClientOverride = null;

const ENTRY_PUBLIC_SELECTION = [
  "id",
  "seasonId",
  "entryName",
  "isDeleted",
  "createdAt",
  "updatedAt",
];

const PICK_SUBMISSION_SELECTION = ["id", "seasonId", "entryId", "gameId"];

const PICK_REVEALED_SELECTION = [
  "id",
  "seasonId",
  "entryId",
  "gameId",
  "selectedTeam",
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
  (entries || []).slice().sort((left, right) =>
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
  const currentEntryIds = currentEntries.map((entry) => entry.id).filter(Boolean);
  const lockedGames = games.filter((game) => isGamePickLocked(game, now));

  const [entries, submittedPicks, ownedPicks, revealedPicksByGame] =
    await Promise.all([
      listAllModelItems(
        client.models.Entry.list,
        {
          filter: {
            seasonId: { eq: seasonId },
            isDeleted: { eq: false },
          },
          selectionSet: ENTRY_PUBLIC_SELECTION,
          authMode: "userPool",
        },
        "Unable to load entries for pick splits.",
      ),
      listAllModelItems(
        client.models.Pick.list,
        {
          filter: {
            seasonId: { eq: seasonId },
          },
          selectionSet: PICK_SUBMISSION_SELECTION,
          authMode: "userPool",
        },
        "Unable to load pick submission totals.",
      ),
      owner
        ? listAllModelItems(
            client.models.Pick.list,
            {
              filter: {
                seasonId: { eq: seasonId },
                owner: { eq: owner },
              },
              selectionSet: PICK_REVEALED_SELECTION,
              authMode: "userPool",
            },
            "Unable to load your picks for games.",
          )
        : Promise.resolve([]),
      Promise.all(
        lockedGames.map(async (game) => {
          const picks = await listAllModelItems(
            client.models.Pick.list,
            {
              filter: {
                gameId: { eq: game.id },
              },
              selectionSet: PICK_REVEALED_SELECTION,
              authMode: "userPool",
            },
            "Unable to load revealed pick splits.",
          );

          return [game.id, picks];
        }),
      ),
    ]);

  const revealedPicksByGameId = Object.fromEntries(revealedPicksByGame);
  const activeEntries = sortEntriesByName(entries);

  return games.reduce((accumulator, game) => {
    accumulator[game.id] = buildGamePickSplitView({
      game,
      entries: activeEntries,
      submittedPicks,
      revealedPicks: revealedPicksByGameId[game.id] || [],
      ownedPicks,
      currentEntryIds,
      now,
    });
    return accumulator;
  }, {});
};
