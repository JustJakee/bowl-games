import { generateClient } from "aws-amplify/api";
import { listSubmissions } from "../graphql/queries";
import { AWS_DISABLED } from "../constants/appFlags";

export const fetchPicks = async () => {
  if (AWS_DISABLED) {
    return { data: { listSubmissions: { items: [] } } };
  }
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
