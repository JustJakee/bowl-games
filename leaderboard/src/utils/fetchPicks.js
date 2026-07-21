import { dataClient } from "../auth/amplifyConfig";
import { listSubmissions } from "../graphql/queries";
import { AWS_DISABLED } from "../constants/appFlags";

export const fetchPicks = async () => {
  if (AWS_DISABLED) {
    return { data: { listSubmissions: { items: [] } } };
  }
  try {
    const picksData = await dataClient.graphql({
      query: listSubmissions,
    });

    return picksData;
  } catch (error) {
    console.error("Error fetching matchups:", error);
    return [];
  }
};
