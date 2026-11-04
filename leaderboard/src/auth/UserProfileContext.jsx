// STATE — USER PROFILE — REACT CONTEXT
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  getCurrentUserProfile,
  updateCurrentUserFavoriteTeam,
} from "./userProfile";

const UserProfileContext = createContext(null);

export const profileBelongsToOwner = (profile, owner) =>
  Boolean(profile?.owner && owner && profile.owner === owner);

export const UserProfileProvider = ({ children }) => {
  const { hasValidTokens, isAuthenticated, isConfigured, isLoading, user } =
    useAuth();
  const [state, setState] = useState({
    status: "idle",
    profile: null,
    error: "",
  });

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
      setState({
        status: "idle",
        profile: null,
        error: "",
      });
      return;
    }

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
        if (!active) return;
        setState({
          status: profile ? "ready" : "needs-setup",
          profile,
          error: "",
        });
      } catch (error) {
        if (!active) return;
        setState({
          status: "error",
          profile: null,
          error:
            error?.message ||
            "Unable to load your profile right now. Please try again.",
        });
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [hasValidTokens, isAuthenticated, isConfigured, isLoading, owner]);

  const updateFavoriteTeam = useCallback(
    async (favoriteTeamId) => {
      if (!profileBelongsToOwner(state.profile, owner)) {
        throw new Error("Your profile is not ready.");
      }

      const updatedProfile = await updateCurrentUserFavoriteTeam({
        profileId: state.profile.id,
        favoriteTeamId,
      });

      setState((current) =>
        profileBelongsToOwner(current.profile, owner)
          ? {
              ...current,
              status: "ready",
              profile: { ...current.profile, ...updatedProfile },
              error: "",
            }
          : current,
      );
      return updatedProfile;
    },
    [owner, state.profile],
  );

  const value = useMemo(
    () => ({ ...state, updateFavoriteTeam }),
    [state, updateFavoriteTeam],
  );

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
