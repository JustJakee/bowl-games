import { generateClient } from 'aws-amplify/api';
import { deleteMatchup } from '../graphql/mutations';

export const deleteMatchups = async () => {
  const client = generateClient();

  try {
    // Fetch all matchups
    const allMatchupsData = await client.graphql({
      query: `
        query ListMatchups {
          listMatchups {
            items {
              id
            }
          }
        }
      `
    });

    const allMatchups = allMatchupsData.data.listMatchups.items;

    // Loop through and delete each matchup by id
    for (let matchup of allMatchups) {
      await client.graphql({
        query: deleteMatchup,
        variables: { input: { id: matchup.id } },
      });
      console.log(`Deleted matchup with id: ${matchup.id}`);
    }

    console.log('All matchups deleted successfully!');
  } catch (error) {
    console.error('Error deleting matchups: ', error);
  }
};
