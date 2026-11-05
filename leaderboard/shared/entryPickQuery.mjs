// Use the GraphQL boundary directly: the installed generated index client drops
// errors when AppSync returns partial data (including a null index connection).
export const ENTRY_PICK_QUERY = `query EntryPicks(
  $entryId: ID!, $gameId: ModelIDKeyConditionInput,
  $filter: ModelPickFilterInput, $nextToken: String, $limit: Int
) {
  pickByEntryAndGame(entryId: $entryId, gameId: $gameId,
    filter: $filter, nextToken: $nextToken, limit: $limit) {
    items { id entryId seasonId gameId owner selectedTeam createdAt updatedAt }
    nextToken
  }
}`;

export const readEntryPickPages = async (
  client,
  { entryId, gameId, seasonId, authMode, label },
) => {
  const picks = [];
  const tokens = new Set();
  let nextToken;
  do {
    let result;
    try {
      result = await client.graphql({
        query: ENTRY_PICK_QUERY,
        variables: {
          entryId,
          // gameId is the index sort key, so it belongs in the key condition,
          // never in DynamoDB's post-query filter.
          ...(gameId ? { gameId: { eq: gameId } } : {}),
          ...(seasonId ? { filter: { seasonId: { eq: seasonId } } } : {}),
          nextToken,
          limit: 100,
        },
        authMode,
      });
    } catch (error) {
      if (!error?.errors?.length) throw error;
      result = error;
    }
    if (result?.errors?.length) {
      const error = new Error(
        `${label}: ${result.errors.map((item) => item.message || "GraphQL error").join("; ")}`,
      );
      error.graphQLErrors = result.errors;
      throw error;
    }
    const connection = result?.data?.pickByEntryAndGame;
    if (
      !Array.isArray(connection?.items) ||
      connection.items.some(
        (pick) =>
          !pick?.id ||
          !pick.entryId ||
          !pick.seasonId ||
          !pick.gameId ||
          typeof pick.selectedTeam !== "string",
      ) ||
      (connection.nextToken != null && typeof connection.nextToken !== "string")
    )
      throw new Error(`${label}: invalid backend response (pick list).`);
    if (
      connection.items.some(
        (pick) =>
          pick.entryId !== entryId ||
          (gameId && pick.gameId !== gameId) ||
          (seasonId && pick.seasonId !== seasonId),
      )
    )
      throw new Error(
        `${label}: the pick list does not match the requested entry, season or game.`,
      );
    picks.push(...connection.items);
    nextToken = connection.nextToken || undefined;
    if (nextToken && tokens.has(nextToken))
      throw new Error(`${label}: repeated pagination token.`);
    if (nextToken) tokens.add(nextToken);
  } while (nextToken);
  return picks;
};
