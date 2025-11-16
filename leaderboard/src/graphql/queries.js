/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getSubmission = /* GraphQL */ `
  query GetSubmission($id: ID!) {
    getSubmission(id: $id) {
      id
      name
      email
      picks
      tieBreaker
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listSubmissions = /* GraphQL */ `
  query ListSubmissions(
    $filter: ModelSubmissionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSubmissions(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        email
        picks
        tieBreaker
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
