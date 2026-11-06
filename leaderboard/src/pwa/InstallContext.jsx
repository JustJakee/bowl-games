import { createContext, useContext, useEffect, useMemo, useState } from "react";

const InstallContext = createContext(null);

const isRunningInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true);

export function InstallProvider({ children }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isRunningInstalled);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(isRunningInstalled());
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", updateInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", updateInstalled);
    };
  }, []);

  const value = useMemo(
    () => ({
      installed,
      canPrompt: Boolean(promptEvent),
      promptInstall: async () => {
        if (!promptEvent) return false;
        setPromptEvent(null);
        try {
          const result = await promptEvent.prompt();
          if (result?.outcome === "accepted") setInstalled(true);
          return result?.outcome === "accepted";
        } catch {
          return false;
        }
      },
    }),
    [installed, promptEvent],
  );

  return (
    <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
  );
}

export function useInstallApp() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("useInstallApp must be used within InstallProvider");
  return context;
}
