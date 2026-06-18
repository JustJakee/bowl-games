// GLOBAL AWS DISABLE FOR OFFSEASON
export const AWS_DISABLED = true;

export const LOCAL_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_LOCAL_AUTH_BYPASS === "true";

export const LOCAL_AUTH_EMAIL =
  import.meta.env.VITE_LOCAL_AUTH_EMAIL || "local-player@example.com";

export const LOCAL_AUTH_USERNAME =
  import.meta.env.VITE_LOCAL_AUTH_USERNAME || "LocalPlayer";

const localGroups = (import.meta.env.VITE_LOCAL_AUTH_GROUPS || "player")
  .split(",")
  .map((group) => group.trim().toLowerCase())
  .filter(Boolean);

export const LOCAL_AUTH_GROUPS = localGroups.length > 0 ? localGroups : ["player"];

export const LOCAL_AUTH_ROLE = LOCAL_AUTH_GROUPS.includes("admin")
  ? "admin"
  : LOCAL_AUTH_GROUPS.includes("player")
    ? "player"
    : null;

// TODO(go-live): Remove the local auth bypass and fake user helpers before production launch.
export const createLocalAuthUser = () => ({
  userId: "local-dev-user",
  username: LOCAL_AUTH_EMAIL,
  signInDetails: {
    loginId: LOCAL_AUTH_EMAIL,
  },
});

export const createLocalUserProfile = () => ({
  id: "local-dev-profile",
  owner: "local-dev-user",
  email: LOCAL_AUTH_EMAIL,
  username: LOCAL_AUTH_USERNAME,
  usernameKey: LOCAL_AUTH_USERNAME.toLowerCase(),
});
