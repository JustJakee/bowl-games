import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { GAME_SELECTION } from "./seasonRepository";
import { isPickableBowlName } from "../utils/scoreboardGames";

let dataClientOverride = null;
const getDataClient = () => dataClientOverride || configuredDataClient;

export const __setAdminGamesDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
};

export const loadAdminGames = async ({ seasonId }) => {
  if (!seasonId) return [];
  const games = [];
  let nextToken;
  do {
    const result = await getDataClient().models.Game.gamesBySeason(
      { seasonId },
      {
        limit: 100,
        nextToken,
        selectionSet: GAME_SELECTION,
        authMode: "userPool",
      },
    );
    if (result?.errors?.[0]) throw new Error(result.errors[0].message);
    if (!Array.isArray(result?.data))
      throw new Error("Unable to load admin games.");
    games.push(...result.data.filter((game) => game?.seasonId === seasonId));
    nextToken = result.nextToken || undefined;
  } while (nextToken);
  return games
    .filter((game) => isPickableBowlName(game.bowlName))
    .sort((a, b) =>
      String(a.kickoffAt || "").localeCompare(String(b.kickoffAt || "")),
    );
};

export const updateAdminGame = async (input) => {
  const result = await getDataClient().models.Game.update(input, {
    selectionSet: GAME_SELECTION,
    authMode: "userPool",
  });
  if (result.errors?.[0]) throw new Error(result.errors[0].message);
  if (!result.data) throw new Error("The game update was not confirmed.");
  return result.data;
};
