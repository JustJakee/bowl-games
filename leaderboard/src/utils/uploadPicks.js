import { dataClient } from "../auth/amplifyConfig";
import { createSubmission } from "../graphql/mutations";
import { AWS_DISABLED } from "../constants/appFlags";

export const uploadPicks = async (input) => {
  if (AWS_DISABLED) {
    throw new Error("AWS uploads disabled");
  }
  try {
    const result = await dataClient.graphql({
      query: createSubmission,
      variables: { input },
      authMode: "apiKey",
    });
    return result?.data?.createSubmission;
  } catch (error) {
    console.error("uploadPicks failed", error);
    throw error;
  }
};
