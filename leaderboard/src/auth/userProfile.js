// DATA — USER PROFILE — AMPLIFY DATA
import { dataClient as configuredDataClient } from "./amplifyConfig";

const PROFILE_SELECTION = [
  "id",
  "owner",
  "email",
  "username",
  "usernameKey",
  "favoriteTeamId",
];
const USERNAME_LOOKUP_SELECTION = ["username", "usernameKey"];
let dataClientOverride = null;

function getDataClient() {
  return dataClientOverride || configuredDataClient;
}

export const __setUserProfileDataClientForTests = (client) => {
  dataClientOverride = client;
};

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

export const USERNAME_REQUIREMENTS = [
  { id: "no-spaces", label: "No spaces" },
  { id: "length", label: "3–20 characters" },
  {
    id: "allowed-characters",
    label: "Letters, numbers, underscores, and hyphens only",
  },
];

export function evaluateUsernameRequirements(username = "") {
  const value = String(username);
  return [
    {
      ...USERNAME_REQUIREMENTS[0],
      satisfied: value.length > 0 && !/\s/.test(value),
    },
    {
      ...USERNAME_REQUIREMENTS[1],
      satisfied: value.length >= 3 && value.length <= 20,
    },
    {
      ...USERNAME_REQUIREMENTS[2],
      satisfied: value.length > 0 && /^[A-Za-z0-9_-]+$/.test(value),
    },
  ];
}

export function validateUsername(username) {
  const value = String(username || "");

  if (value.length < 3 || value.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }

  if (/\s/.test(value)) {
    return "Username cannot contain spaces.";
  }

  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
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
    },
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
    },
  );

  throwIfGraphQLError(result, "Unable to check username availability.");
  return (result.data?.length ?? 0) > 0;
}

export async function createCurrentUserProfile({
  email,
  preferredGroup,
  username,
}) {
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
    },
  );

  throwIfGraphQLError(result, "Unable to create the user profile.");
  if (!result.data) throw new Error("Unable to create the user profile.");
  return result.data;
}

export async function createCurrentUserProfileWithFavoriteTeam({
  email,
  favoriteTeamId,
  preferredGroup,
  username,
}) {
  const profile = await createCurrentUserProfile({
    email,
    preferredGroup,
    username,
  });

  if (!favoriteTeamId) {
    return { profile, favoriteTeamError: null };
  }

  try {
    const updatedProfile = await updateCurrentUserFavoriteTeam({
      profileId: profile.id,
      favoriteTeamId,
    });
    return {
      profile: {
        ...profile,
        ...updatedProfile,
        favoriteTeamId: String(favoriteTeamId),
      },
      favoriteTeamError: null,
    };
  } catch (favoriteTeamError) {
    return { profile, favoriteTeamError };
  }
}

export async function updateCurrentUserFavoriteTeam({
  profileId,
  favoriteTeamId,
}) {
  if (!profileId) throw new Error("A user profile is required.");
  if (!favoriteTeamId) throw new Error("Select a favorite team.");

  const client = getDataClient();
  const result = await client.models.UserProfile.update(
    { id: profileId, favoriteTeamId: String(favoriteTeamId) },
    {
      selectionSet: PROFILE_SELECTION,
      authMode: "userPool",
    },
  );

  throwIfGraphQLError(result, "Unable to save your favorite team.");
  if (!result.data) throw new Error("Unable to save your favorite team.");
  return result.data;
}
