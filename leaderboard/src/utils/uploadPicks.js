import { generateClient } from "aws-amplify/api";
import { createSubmission } from "../graphql/mutations";

export const uploadPicks = async (input) => {
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
