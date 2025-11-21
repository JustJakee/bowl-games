import { generateClient } from "aws-amplify/api";
import { createSubmission } from "../graphql/mutations";

export const uploadPicks = async (input) => {
  const client = generateClient();
  try {
    const picks = await client.graphql({
      query: createSubmission,
      variables: { input },
    });
    // can be deleted later so no data is exposed, for testing
    console.log(JSON.stringify(picks, null, 2)); 
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
};
