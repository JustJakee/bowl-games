import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getCurrentUserProfile } from "./userProfile";

const UserProfileContext = createContext(null);

export const UserProfileProvider = ({ children }) => {
  const { isAuthenticated, isConfigured, user } = useAuth();
  const [state, setState] = useState({
    status: "idle",
    profile: null,
    error: "",
  });

  const owner = user?.userId || null;

  useEffect(() => {
    if (!isAuthenticated || !isConfigured || !owner) {
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
        status: current.profile ? "refreshing" : "loading",
        profile: current.profile,
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
  }, [isAuthenticated, isConfigured, owner]);

  const value = useMemo(() => ({ ...state }), [state]);

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
