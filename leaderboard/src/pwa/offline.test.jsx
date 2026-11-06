import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { authRestoreIsUnavailable, canRetainVerifiedSession } from "../auth/AuthContext.jsx";
import { OfflineNotice } from "./OfflineIndicator.jsx";
import { browserIsOffline, subscribeToConnectivity } from "./useOfflineStatus.js";
import { isConnectivityFailure } from "./networkError.js";

test("offline notice appears only during connectivity disruption", () => {
  assert.match(
    renderToStaticMarkup(<OfflineNotice status="offline" />),
    /You&#x27;re offline\. Live updates and saving are unavailable\./,
  );
  assert.match(renderToStaticMarkup(<OfflineNotice status="checking" />), /Reconnecting/);
  assert.equal(renderToStaticMarkup(<OfflineNotice status="ready" />), "");
  assert.equal(browserIsOffline({ onLine: false }), true);
  assert.equal(browserIsOffline({ onLine: true }), false);
});

test("only an unexpired verified session survives a connectivity failure", () => {
  const state = { isAuthenticated: true, hasValidTokens: true, tokenExpiresAt: 2000 };
  assert.equal(canRetainVerifiedSession(state, new Error("Network request failed"), 1000), true);
  assert.equal(canRetainVerifiedSession(state, new Error("Network request failed"), 2000), false);
  assert.equal(canRetainVerifiedSession(state, new Error("Forbidden"), 1000), false);
  assert.equal(canRetainVerifiedSession({ ...state, hasValidTokens: false }, new Error("Network request failed"), 1000), false);
  assert.equal(isConnectivityFailure({ name: "NotAuthorizedException" }, true), false);
  assert.equal(isConnectivityFailure(new Error("Access denied"), true), false);
});

test("connectivity subscription handles both disconnect and reconnect", () => {
  const listeners = new Map();
  const target = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
  };
  let changes = 0;
  const unsubscribe = subscribeToConnectivity(() => { changes += 1; }, target);
  listeners.get("offline")();
  listeners.get("online")();
  assert.equal(changes, 2);
  unsubscribe();
  assert.equal(listeners.size, 0);
});

test("offline or failed session verification does not become a signed-out state", () => {
  const noSession = new Error("No authenticated Cognito session is available.");
  assert.equal(authRestoreIsUnavailable(noSession, true), true);
  assert.equal(authRestoreIsUnavailable(noSession, false), false);
  assert.equal(authRestoreIsUnavailable(new Error("Network request failed"), false), true);
  assert.equal(
    authRestoreIsUnavailable({ name: "UserUnAuthenticatedException" }, false),
    false,
  );
});
