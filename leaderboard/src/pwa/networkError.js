import { browserIsOffline } from "./useOfflineStatus.js";

export const isConnectivityFailure = (error, offline = browserIsOffline()) => {
  if (["UserUnAuthenticatedException", "NotAuthorizedException", "UnauthorizedException", "ForbiddenException"].includes(error?.name)) return false;
  if (/\b(unauthorized|forbidden|access denied|not authorized|token expired|session expired)\b/i.test(String(error?.message || ""))) return false;
  if (offline) return true;
  if (["NetworkError", "TimeoutError"].includes(error?.name)) return true;
  const message = String(error?.message || "");
  return /network|failed to fetch|fetch failed|offline|timed? ?out|econn|enotfound|unreachable|load failed/i.test(
    message,
  );
};
