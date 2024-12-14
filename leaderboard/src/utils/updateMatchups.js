import { generateClient } from 'aws-amplify/api';
import { updateMatchup } from '../graphql/mutations';

export const updateMatchups = async (id, winner) => {
  const client = generateClient();
  try {
    const updatedMatchupData = await client.graphql({
      query: updateMatchup,
      variables: {
        input: {
          id,
          winner,
        },
      },
    });
    return updatedMatchupData.data.updateMatchup;
  } catch (error) {
    console.error('Error updating matchup winner:', error);
    return null;
  }
};