import { dataClient } from "../auth/amplifyConfig";

const checked = (result, fallback) => {
  if (result?.errors?.length) throw new Error(result.errors[0].message || fallback);
  if (!result) throw new Error(fallback);
  return result.data;
};

export const listPendingRegistrations = async () =>
  checked(await dataClient.queries.listPendingRegistrations({}, { authMode: "userPool" }), "Unable to load pending registrations.") || [];

export const approveRegistration = async (username) => {
  const approved = checked(await dataClient.mutations.approveRegistration(
    { username }, { authMode: "userPool" },
  ), "Unable to approve registration.");
  if (approved !== true) throw new Error("Approval was not confirmed by the server.");
  return approved;
};
