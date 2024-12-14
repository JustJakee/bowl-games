/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getMatchup = /* GraphQL */ `
  query GetMatchup($id: ID!) {
    getMatchup(id: $id) {
      id
      game
      team1
      team2
      winner
      date
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listMatchups = /* GraphQL */ `
  query ListMatchups(
    $filter: ModelMatchupFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMatchups(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        game
        team1
        team2
        winner
        date
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
