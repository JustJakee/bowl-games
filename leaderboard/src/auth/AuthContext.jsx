import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Hub } from "aws-amplify/utils";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import { configureAmplifyFromOutputs } from "./amplifyConfig";
import {
  createLocalAuthUser,
  LOCAL_AUTH_BYPASS,
  LOCAL_AUTH_EMAIL,
  LOCAL_AUTH_GROUPS,
  LOCAL_AUTH_ROLE,
} from "../constants/appFlags";

const AuthContext = createContext(null);

const normalizeGroups = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((group) => typeof group === "string")
    .map((group) => group.toLowerCase());
};

const getGroupsFromSession = (session) => {
  const accessGroups = session?.tokens?.accessToken?.payload?.["cognito:groups"];
  const idGroups = session?.tokens?.idToken?.payload?.["cognito:groups"];
  const groups = normalizeGroups(accessGroups ?? idGroups);
  return [...new Set(groups)];
};

const getRoleFromGroups = (groups) => {
  if (groups.includes("admin")) {
    return "admin";
  }

  if (groups.includes("player")) {
    return "player";
  }

  return null;
};

const getEmailFromAuth = (user, session) => {
  const idTokenEmail = session?.tokens?.idToken?.payload?.email;
  if (typeof idTokenEmail === "string" && idTokenEmail.length > 0) {
    return idTokenEmail;
  }

  const loginId = user?.signInDetails?.loginId;
  if (typeof loginId === "string" && loginId.length > 0) {
    return loginId;
  }

  return null;
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    isLoading: true,
    isConfigured: false,
    isAuthenticated: false,
    user: null,
    email: null,
    groups: [],
    role: null,
    error: null,
  });

  useEffect(() => {
    if (LOCAL_AUTH_BYPASS) {
      // TODO(go-live): Remove this fake authenticated session path before production launch.
      setState({
        isLoading: false,
        isConfigured: true,
        isAuthenticated: true,
        user: createLocalAuthUser(),
        email: LOCAL_AUTH_EMAIL,
        groups: LOCAL_AUTH_GROUPS,
        role: LOCAL_AUTH_ROLE,
        error: null,
      });

      return undefined;
    }

    let isMounted = true;

    const syncAuthState = async () => {
      try {
        await configureAmplifyFromOutputs();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          isLoading: false,
          isConfigured: false,
          isAuthenticated: false,
          user: null,
          email: null,
          groups: [],
          role: null,
          error,
        });
        return;
      }

      try {
        const [user, session] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);

        if (!isMounted) {
          return;
        }

        const groups = getGroupsFromSession(session);
        setState({
          isLoading: false,
          isConfigured: true,
          isAuthenticated: true,
          user,
          email: getEmailFromAuth(user, session),
          groups,
          role: getRoleFromGroups(groups),
          error: null,
        });
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setState({
          isLoading: false,
          isConfigured: true,
          isAuthenticated: false,
          user: null,
          email: null,
          groups: [],
          role: null,
          error: null,
        });
      }
    };

    syncAuthState();

    const cancel = Hub.listen("auth", () => {
      syncAuthState();
    });

    return () => {
      isMounted = false;
      cancel();
    };
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signOut: async () => {
        if (LOCAL_AUTH_BYPASS) {
          // TODO(go-live): Remove this local-only fake sign-out behavior before production launch.
          setState({
            isLoading: false,
            isConfigured: true,
            isAuthenticated: false,
            user: null,
            email: null,
            groups: [],
            role: null,
            error: null,
          });
          return;
        }

        await signOut();
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
