import { generateClient } from 'aws-amplify/api';
import { createMatchup } from '../graphql/mutations';
import { deleteMatchup } from '../graphql/mutations';
import matchups from '../constants/matchups';

export const insertMatchups = async () => {
  const client = generateClient();

  try {
    // Fetch all existing matchups
    const existingMatchupsData = await client.graphql({
      query: `
        query ListMatchups {
          listMatchups {
            items {
              id
              game
            }
          }
        }
      `
    });

    const existingMatchups = existingMatchupsData.data.listMatchups.items;

    // Loop through the matchups array and insert only if not duplicate
    for (let matchup of matchups) {
      const duplicateMatchup = existingMatchups.find(existingMatchup => existingMatchup.game === matchup.game);

      if (duplicateMatchup) {
        // If a duplicate is found, delete it by ID
        await client.graphql({
          query: deleteMatchup,
          variables: { input: { id: duplicateMatchup.id } },
        });
        console.log(`Deleted duplicate matchup: ${duplicateMatchup.game}`);
      }

      // Insert the new matchup
      await client.graphql({
        query: createMatchup,
        variables: { input: matchup },
      });
      console.log(`Inserted matchup: ${matchup.game}`);
    }
  } catch (error) {
    console.error('Error processing matchups: ', error);
  }
};
