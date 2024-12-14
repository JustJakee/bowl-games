/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createMatchup = /* GraphQL */ `
  mutation CreateMatchup(
    $input: CreateMatchupInput!
    $condition: ModelMatchupConditionInput
  ) {
    createMatchup(input: $input, condition: $condition) {
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
export const updateMatchup = /* GraphQL */ `
  mutation UpdateMatchup(
    $input: UpdateMatchupInput!
    $condition: ModelMatchupConditionInput
  ) {
    updateMatchup(input: $input, condition: $condition) {
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
export const deleteMatchup = /* GraphQL */ `
  mutation DeleteMatchup(
    $input: DeleteMatchupInput!
    $condition: ModelMatchupConditionInput
  ) {
    deleteMatchup(input: $input, condition: $condition) {
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
