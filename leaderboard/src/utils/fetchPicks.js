import { generateClient } from "aws-amplify/api";
import { listSubmissions } from "../graphql/queries";

export const fetchPicks = async () => {
  const client = generateClient();
  try {
    const picksData = await client.graphql({
      query: listSubmissions,
    });

    return picksData;
  } catch (error) {
    console.error("Error fetching matchups:", error);
    return [];
  }
};
