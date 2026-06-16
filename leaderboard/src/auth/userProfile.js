import { generateClient } from "aws-amplify/api";

let dataClient;

const PROFILE_SELECTION = ["id", "owner", "email", "username", "usernameKey"];
const USERNAME_LOOKUP_SELECTION = ["username", "usernameKey"];

function getDataClient() {
  if (!dataClient) {
    dataClient = generateClient();
  }

  return dataClient;
}

function getFirstGraphQLError(result) {
  return result?.errors?.[0]?.message || null;
}

function throwIfGraphQLError(result, fallbackMessage) {
  const errorMessage = getFirstGraphQLError(result);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  if (!result) {
    throw new Error(fallbackMessage);
  }
}

export function normalizeUsernameKey(username) {
  return username.trim().toLowerCase();
}

export function validateUsername(username) {
  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }

  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return "Use only letters, numbers, underscores, and hyphens.";
  }

  return null;
}

export async function getCurrentUserProfile(owner) {
  const client = getDataClient();
  const result = await client.models.UserProfile.userProfileByOwner(
    { owner },
    {
      limit: 1,
      selectionSet: PROFILE_SELECTION,
      authMode: "userPool",
    }
  );

  throwIfGraphQLError(result, "Unable to load the current user profile.");
  return result.data?.[0] ?? null;
}

export async function isUsernameTaken(usernameKey) {
  const client = getDataClient();
  const result = await client.models.UserProfile.userProfileByUsernameKey(
    { usernameKey },
    {
      limit: 1,
      selectionSet: USERNAME_LOOKUP_SELECTION,
      authMode: "userPool",
    }
  );

  throwIfGraphQLError(result, "Unable to check username availability.");
  return (result.data?.length ?? 0) > 0;
}

export async function createCurrentUserProfile({ email, preferredGroup, username }) {
  const client = getDataClient();
  const usernameKey = normalizeUsernameKey(username);

  // TODO: This client-side availability check is not race-condition-safe. A
  // later custom mutation or reserved-username strategy should enforce global
  // uniqueness server-side.
  const result = await client.models.UserProfile.create(
    {
      email,
      preferredGroup: preferredGroup || undefined,
      username: username.trim(),
      usernameKey,
    },
    {
      selectionSet: PROFILE_SELECTION,
      authMode: "userPool",
    }
  );

  throwIfGraphQLError(result, "Unable to create the user profile.");
  return result.data;
}
