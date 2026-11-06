// AUTH — SESSION RESTORATION — COGNITO
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Hub } from "aws-amplify/utils";
import {
  fetchAuthSession,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { configureAmplifyFromOutputs } from "./amplifyConfig";
import { browserIsOffline } from "../pwa/useOfflineStatus.js";
import { isConnectivityFailure } from "../pwa/networkError.js";

const AuthContext = createContext(null);
const NO_SESSION_MESSAGE = "No authenticated Cognito session is available.";

export const authRestoreIsUnavailable = (error, offline) => {
  if (offline) return true;
  if (error?.message === NO_SESSION_MESSAGE) return false;
  return !["UserUnAuthenticatedException", "NotAuthorizedException"].includes(
    error?.name,
  );
};

export const canRetainVerifiedSession = (state, error, now = Date.now()) =>
  Boolean(
    state.isAuthenticated &&
    state.hasValidTokens &&
    state.tokenExpiresAt > now &&
    isConnectivityFailure(error),
  );

const unauthenticatedState = {
  isLoading: false,
  isConfigured: true,
  isAuthenticated: false,
  isUnavailable: false,
  hasValidTokens: false,
  tokenExpiresAt: 0,
  user: null,
  email: null,
  groups: [],
  role: null,
  error: null,
};

const normalizeGroups = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((group) => typeof group === "string")
    .map((group) => group.toLowerCase());
};

const getGroupsFromSession = (session) => {
  const accessGroups =
    session?.tokens?.accessToken?.payload?.["cognito:groups"];
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
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({
    isLoading: true,
    isConfigured: false,
    isAuthenticated: false,
    isUnavailable: false,
    hasValidTokens: false,
    tokenExpiresAt: 0,
    user: null,
    email: null,
    groups: [],
    role: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;

    const syncAuthState = async () => {
      const currentRequest = ++requestId;
      const isCurrent = () => isMounted && currentRequest === requestId;
      // Authentication remains loading until Amplify configuration and Cognito token restoration finish.
      setState((current) => {
        // Token refresh Hub events are background work. Retain a usable
        // authenticated session until refresh actually fails so data providers
        // do not clear and remount the active route.
        if (
          current.isAuthenticated &&
          current.hasValidTokens &&
          current.tokenExpiresAt > Date.now()
        ) {
          return { ...current, error: null, isUnavailable: false };
        }

        return {
          ...current,
          isLoading: true,
          hasValidTokens: false,
          tokenExpiresAt: 0,
          isUnavailable: false,
          error: null,
        };
      });

      try {
        await configureAmplifyFromOutputs();
      } catch (error) {
        if (!isCurrent()) {
          return;
        }

        setState({
          isLoading: false,
          isConfigured: false,
          isAuthenticated: false,
          isUnavailable: false,
          hasValidTokens: false,
          tokenExpiresAt: 0,
          user: null,
          email: null,
          groups: [],
          role: null,
          error,
        });
        return;
      }

      try {
        const session = await fetchAuthSession();
        const accessToken = session?.tokens?.accessToken;

        if (!accessToken) {
          throw new Error(NO_SESSION_MESSAGE);
        }
        const tokenExpiresAt = Number(accessToken.payload?.exp) * 1000;
        if (!Number.isFinite(tokenExpiresAt) || tokenExpiresAt <= Date.now()) {
          const expired = new Error("The Cognito session has expired.");
          expired.name = "UserUnAuthenticatedException";
          throw expired;
        }

        const user = await getCurrentUser();

        if (!isCurrent()) {
          return;
        }

        const groups = getGroupsFromSession(session);
        setState({
          isLoading: false,
          isConfigured: true,
          isAuthenticated: true,
          isUnavailable: false,
          hasValidTokens: true,
          tokenExpiresAt,
          user,
          email: getEmailFromAuth(user, session),
          groups,
          role: getRoleFromGroups(groups),
          error: null,
        });
      } catch (error) {
        if (!isCurrent()) {
          return;
        }

        setState((current) =>
          canRetainVerifiedSession(current, error)
            ? { ...current, isLoading: false, error: null }
            : authRestoreIsUnavailable(error, browserIsOffline())
              ? { ...unauthenticatedState, isUnavailable: true, error }
              : unauthenticatedState,
        );
      }
    };

    syncAuthState();

    const cancel = Hub.listen("auth", ({ payload }) => {
      // Hub events resynchronize state after interactive sign-in, token, and sign-out transitions.
      if (payload?.event === "signedOut") {
        requestId += 1;
        setState(unauthenticatedState);
        return;
      }

      syncAuthState();
    });
    window.addEventListener("online", syncAuthState);

    return () => {
      isMounted = false;
      cancel();
      window.removeEventListener("online", syncAuthState);
    };
  }, [retryKey]);

  useEffect(() => {
    if (!state.isAuthenticated || !state.tokenExpiresAt) return;
    const remaining = state.tokenExpiresAt - Date.now();
    const timer = window.setTimeout(
      () => setRetryKey((current) => current + 1),
      Math.max(0, Math.min(remaining, 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [state.isAuthenticated, state.tokenExpiresAt]);

  const value = useMemo(
    () => ({
      ...state,
      retryAuth: () => setRetryKey((current) => current + 1),
      signOut: async () => {
        setState({ ...unauthenticatedState, isLoading: true });

        try {
          await amplifySignOut();
        } finally {
          setState(unauthenticatedState);
        }
      },
    }),
    [state],
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
