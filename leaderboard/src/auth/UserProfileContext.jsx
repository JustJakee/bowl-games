// STATE — USER PROFILE — REACT CONTEXT
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  getCurrentUserProfile,
  updateCurrentUserFavoriteTeam,
} from "./userProfile";
import { isConnectivityFailure } from "../pwa/networkError.js";

const UserProfileContext = createContext(null);

export const profileBelongsToOwner = (profile, owner) =>
  Boolean(profile?.owner && owner && profile.owner === owner);

export const mergePersistedFavoriteTeamProfile = (
  profile,
  updatedProfile,
  favoriteTeamId,
) => ({
  ...profile,
  ...updatedProfile,
  favoriteTeamId: String(favoriteTeamId),
});

export const applySavedFavoriteTeamToState = (
  current,
  owner,
  updatedProfile,
  favoriteTeamId,
) =>
  profileBelongsToOwner(current.profile, owner)
    ? {
        ...current,
        status: "ready",
        profile: mergePersistedFavoriteTeamProfile(
          current.profile,
          updatedProfile,
          favoriteTeamId,
        ),
        error: "",
      }
    : current;

export const UserProfileProvider = ({ children }) => {
  const { hasValidTokens, isAuthenticated, isConfigured, isLoading, user } =
    useAuth();
  const [state, setState] = useState({
    status: "idle",
    profile: null,
    error: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const profileRequestIdRef = useRef(0);
  const retryProfile = useCallback(() => setRetryKey((current) => current + 1), []);

  const owner = user?.userId || null;

  useEffect(() => {
    // AUTH — USER PROFILE — AMPLIFY DATA
    // Player-owned profile reads wait for Cognito restoration to produce valid tokens and an owner ID.
    if (
      isLoading ||
      !isAuthenticated ||
      !isConfigured ||
      !hasValidTokens ||
      !owner
    ) {
      profileRequestIdRef.current += 1;
      setState({
        status: "idle",
        profile: null,
        error: "",
      });
      return;
    }

    const requestId = ++profileRequestIdRef.current;
    let active = true;

    const loadProfile = async () => {
      setState((current) => ({
        status: profileBelongsToOwner(current.profile, owner)
          ? "refreshing"
          : "loading",
        profile: profileBelongsToOwner(current.profile, owner)
          ? current.profile
          : null,
        error: "",
      }));

      try {
        const profile = await getCurrentUserProfile(owner);
        if (!active || requestId !== profileRequestIdRef.current) return;
        setState({
          status: profile ? "ready" : "needs-setup",
          profile,
          error: "",
        });
      } catch (error) {
        if (!active || requestId !== profileRequestIdRef.current) return;
        setState((current) =>
          isConnectivityFailure(error) && profileBelongsToOwner(current.profile, owner)
            ? {
                ...current,
                status: "stale",
                error: error?.message || "Unable to refresh your profile.",
              }
            : {
                status: "error",
                profile: null,
                error:
                  error?.message ||
                  "Unable to load your profile right now. Please try again.",
              },
        );
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [hasValidTokens, isAuthenticated, isConfigured, isLoading, owner, retryKey]);

  useEffect(() => {
    if (state.status !== "error" && state.status !== "stale") return;
    window.addEventListener("online", retryProfile);
    return () => window.removeEventListener("online", retryProfile);
  }, [retryProfile, state.status]);

  const updateFavoriteTeam = useCallback(
    async (favoriteTeamId) => {
      if (!profileBelongsToOwner(state.profile, owner)) {
        throw new Error("Your profile is not ready.");
      }

      const updatedProfile = await updateCurrentUserFavoriteTeam({
        profileId: state.profile.id,
        favoriteTeamId,
      });

      // The mutation has persisted successfully. Invalidate any older profile read
      // before publishing the confirmed team ID to both account cards.
      profileRequestIdRef.current += 1;
      const savedProfile = mergePersistedFavoriteTeamProfile(
        state.profile,
        updatedProfile,
        favoriteTeamId,
      );
      setState((current) =>
        applySavedFavoriteTeamToState(
          current,
          owner,
          updatedProfile,
          favoriteTeamId,
        ),
      );
      return savedProfile;
    },
    [owner, state.profile],
  );

  const adoptCreatedProfile = useCallback(
    (createdProfile) => {
      if (!profileBelongsToOwner(createdProfile, owner)) {
        throw new Error("The saved profile does not match your account.");
      }

      profileRequestIdRef.current += 1;
      setState({ status: "ready", profile: createdProfile, error: "" });
      return createdProfile;
    },
    [owner],
  );

  const value = useMemo(() => {
    const currentProfile = profileBelongsToOwner(state.profile, owner)
      ? state.profile
      : null;
    const status = !currentProfile && ["ready", "refreshing", "stale"].includes(state.status)
      ? "loading"
      : state.status;
    return {
      ...state,
      status,
      profile: currentProfile,
      adoptCreatedProfile,
      retryProfile,
      updateFavoriteTeam,
    };
  }, [adoptCreatedProfile, owner, retryProfile, state, updateFavoriteTeam]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
};
