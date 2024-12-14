import { generateClient } from 'aws-amplify/api';
import { listMatchups } from '../graphql/queries';

export const fetchMatchups = async () => {
const client = generateClient();
  try {
    const matchupData = await client.graphql({
      query: listMatchups,
    });
    const matchups = matchupData.data.listMatchups.items;
    return matchups;
  } catch (error) {
    console.error('Error fetching matchups:', error);
    return [];
  }
};
