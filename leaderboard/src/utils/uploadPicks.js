import { generateClient } from "aws-amplify/api";
import { createSubmission } from "../graphql/mutations";
import { AWS_DISABLED } from "../constants/appFlags";

export const uploadPicks = async (input) => {
  if (AWS_DISABLED) {
    throw new Error("AWS uploads disabled");
  }
  const client = generateClient();
  try {
    const result = await client.graphql({
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
