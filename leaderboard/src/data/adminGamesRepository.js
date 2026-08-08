import { dataClient as configuredDataClient } from "../auth/amplifyConfig";
import { GAME_SELECTION } from "./seasonRepository";

let dataClientOverride = null;
const getDataClient = () => dataClientOverride || configuredDataClient;

export const __setAdminGamesDataClientForTests = (dataClient) => {
  dataClientOverride = dataClient;
};

export const loadAdminGames = async ({ seasonId }) => {
  if (!seasonId) return [];
  const result = await getDataClient().models.Game.list({
    filter: { seasonId: { eq: seasonId } },
    selectionSet: GAME_SELECTION,
    authMode: "userPool",
  });
  if (result.errors?.[0]) throw new Error(result.errors[0].message);
  return (result.data || []).filter(Boolean).sort((a, b) =>
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
