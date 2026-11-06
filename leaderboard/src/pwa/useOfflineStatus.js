import { useSyncExternalStore } from "react";

export const browserIsOffline = (browserNavigator = globalThis.navigator) =>
  browserNavigator?.onLine === false;

export const subscribeToConnectivity = (
  onChange,
  browserWindow = globalThis.window,
) => {
  if (!browserWindow) return () => {};
  browserWindow.addEventListener("online", onChange);
  browserWindow.addEventListener("offline", onChange);
  return () => {
    browserWindow.removeEventListener("online", onChange);
    browserWindow.removeEventListener("offline", onChange);
  };
};

export const useOfflineStatus = () =>
  useSyncExternalStore(subscribeToConnectivity, browserIsOffline, () => false);
