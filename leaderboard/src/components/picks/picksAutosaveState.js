export const getDraftRevision = (draft) => {
  const revision = Number(draft?.revision);

  if (Number.isSafeInteger(revision) && revision >= 0) {
    return revision;
  }

  // Drafts written before revision tracking were added still need one save
  // attempt when they contain unsynchronized device changes.
  return draft?.dirty ? 1 : 0;
};

const areSelectionMapsEqual = (left = {}, right = {}) => {
  const leftEntries = Object.entries(left || {});
  const rightKeys = Object.keys(right || {});

  return (
    leftEntries.length === rightKeys.length &&
    leftEntries.every(([gameId, selectedTeam]) => right?.[gameId] === selectedTeam)
  );
};

export const isDraftSyncedWithBackend = (draft, backendDraft) =>
  Boolean(
    draft &&
      !draft.dirty &&
      draft.entryName === backendDraft?.entryName &&
      String(draft.tieBreakerValue ?? "") ===
        String(backendDraft?.tieBreakerValue ?? "") &&
      areSelectionMapsEqual(
        draft.selectionsByGameId,
        backendDraft?.selectionsByGameId,
      ),
  );

export const isDraftCacheReady = (loadedStorageKey, currentStorageKey) =>
  Boolean(
    currentStorageKey && loadedStorageKey === currentStorageKey,
  );

export const buildSyncedDraft = (result, revision = 0) => ({
  entryName: result.entry.entryName,
  selectionsByGameId: result.selectionsByGameId,
  tieBreakerValue:
    result.entry.tieBreakerValue === null ||
    result.entry.tieBreakerValue === undefined
      ? ""
      : String(result.entry.tieBreakerValue),
  revision,
  dirty: false,
});

export const buildAutosaveSuccessState = () => ({
  state: "saved",
  message: "Saved to account",
  detail: "",
});

export const buildAutosaveFailureState = (error) => {
  const message =
    error?.message || "Backend save failed. Retry is required.";
  const reference = error?.correlationId
    ? ` Reference: ${error.correlationId}.`
    : "";

  return {
    state: "device",
    message: "Saved to device",
    detail: `${message}${reference}`,
  };
};

export const buildAutosaveDiagnostic = ({
  error,
  entryId,
  revision,
  localSelectionCount,
}) => ({
  correlationId: error?.correlationId || null,
  timestamp: new Date().toISOString(),
  entryId: error?.entryId || entryId || "",
  revision,
  gameId: error?.gameId || null,
  pickId: error?.pickId || null,
  selectedTeam: error?.selectedTeam || null,
  operation: error?.operation || null,
  graphQLErrors: Array.isArray(error?.graphQLErrors)
    ? error.graphQLErrors
    : [],
  returnedData: error?.returnedData ?? null,
  thrownError: {
    name: error?.name || "Error",
    message: error?.message || "Backend save failed.",
  },
  localSelectionCount,
  cloudSaveCompleted: false,
});

export const shouldApplyPickSaveResult = ({
  activeEntryId,
  requestedEntryId,
  resultEntryId,
  currentScope,
  requestScope,
}) =>
  Boolean(
    activeEntryId &&
      requestedEntryId &&
      resultEntryId &&
      activeEntryId === requestedEntryId &&
      requestedEntryId === resultEntryId &&
      Boolean(requestScope) &&
      requestScope === currentScope,
  );

export const createPerEntryAutosaveCoordinator = ({
  save,
  onSuccess = () => true,
  onError = () => undefined,
}) => {
  if (typeof save !== "function") {
    throw new TypeError("An autosave function is required.");
  }

  const statesByEntryId = new Map();
  const buildStateKey = (entryId, scope = "") =>
    `${scope || "default"}\u0000${entryId}`;

  const getEntryState = (entryId, scope = "") => {
    const stateKey = buildStateKey(entryId, scope);
    let state = statesByEntryId.get(stateKey);

    if (!state) {
      state = {
        inFlight: null,
        pending: null,
        latestRevision: -1,
      };
      statesByEntryId.set(stateKey, state);
    }

    return state;
  };

  const notifyRequest = (request, outcome) => {
    request.listeners.forEach((resolve) => resolve(outcome));
    request.listeners = [];
  };

  const supersedePendingRequest = (state) => {
    if (!state.pending) {
      return;
    }

    notifyRequest(state.pending, {
      status: "superseded",
      entryId: state.pending.entryId,
      revision: state.pending.revision,
    });
    state.pending = null;
  };

  const markLatest = (entryId, revision, scope = "") => {
    if (!entryId || !Number.isSafeInteger(revision) || revision < 0) {
      return false;
    }

    const state = getEntryState(entryId, scope);

    if (revision > state.latestRevision) {
      supersedePendingRequest(state);
    }

    state.latestRevision = Math.max(state.latestRevision, revision);
    return true;
  };

  const nextRevision = (
    entryId,
    minimumRevision = 0,
    scope = "",
  ) => {
    if (!entryId) {
      return null;
    }

    const normalizedMinimum =
      Number.isSafeInteger(minimumRevision) && minimumRevision >= 0
        ? minimumRevision
        : 0;
    const state = getEntryState(entryId, scope);
    const revision =
      Math.max(state.latestRevision, normalizedMinimum) + 1;
    markLatest(entryId, revision, scope);
    return revision;
  };

  const runRequest = (state, request) => {
    state.inFlight = request;

    const settle = async () => {
      try {
        const result = await save(request);

        if (request.revision === state.latestRevision) {
          let resultAccepted = false;

          try {
            resultAccepted = onSuccess({ ...request, result }) !== false;
          } catch (callbackError) {
            notifyRequest(request, {
              status: "failed",
              entryId: request.entryId,
              revision: request.revision,
              error: callbackError,
              result,
            });
            return;
          }

          notifyRequest(
            request,
            resultAccepted
              ? {
                  status: "saved",
                  entryId: request.entryId,
                  revision: request.revision,
                  result,
                }
              : {
                  status: "failed",
                  entryId: request.entryId,
                  revision: request.revision,
                  error: new Error(
                    "The saved response did not match the current entry or session.",
                  ),
                  result,
                },
          );
        } else {
          notifyRequest(request, {
            status: "superseded",
            entryId: request.entryId,
            revision: request.revision,
            result,
          });
        }
      } catch (error) {
        if (request.revision === state.latestRevision) {
          let callbackError = null;

          try {
            onError({ ...request, error });
          } catch (nextCallbackError) {
            callbackError = nextCallbackError;
          }

          notifyRequest(request, {
            status: "failed",
            entryId: request.entryId,
            revision: request.revision,
            error,
            callbackError,
          });
        } else {
          notifyRequest(request, {
            status: "superseded",
            entryId: request.entryId,
            revision: request.revision,
            error,
          });
        }
      } finally {
        state.inFlight = null;
        const nextRequest = state.pending;
        state.pending = null;

        // A revision may be marked as latest before its debounce timer queues
        // the request. Never start an older pending snapshot in that window.
        if (
          nextRequest &&
          nextRequest.revision === state.latestRevision
        ) {
          runRequest(state, nextRequest);
        }
      }
    };

    void settle();
  };

  const enqueue = (request) => {
    const entryId = request?.entryId;
    const revision = request?.revision;

    if (!markLatest(entryId, revision, request?.scope)) {
      return Promise.resolve({
        status: "ignored",
        entryId: entryId || "",
        revision: Number.isSafeInteger(revision) ? revision : null,
      });
    }

    const state = getEntryState(entryId, request?.scope);

    if (revision < state.latestRevision) {
      return Promise.resolve({
        status: "superseded",
        entryId,
        revision,
      });
    }

    let queuedRequest;
    let shouldStart = false;

    if (state.inFlight) {
      if (state.inFlight.revision === revision) {
        queuedRequest = state.inFlight;
      } else if (state.pending?.revision === revision) {
        queuedRequest = state.pending;
      } else {
        // Only the newest unsaved snapshot matters. The current request
        // remains in flight; every intermediate snapshot is coalesced.
        supersedePendingRequest(state);
        queuedRequest = {
          ...request,
          listeners: [],
        };
        state.pending = queuedRequest;
      }
    } else {
      queuedRequest = {
        ...request,
        listeners: [],
      };
      shouldStart = true;
    }

    const outcomePromise = new Promise((resolve) => {
      queuedRequest.listeners.push(resolve);
    });

    if (shouldStart) {
      runRequest(state, queuedRequest);
    }

    return outcomePromise;
  };

  const cancelPending = (entryId, scope = "") => {
    if (entryId) {
      const state = statesByEntryId.get(buildStateKey(entryId, scope));
      if (state) {
        supersedePendingRequest(state);
      }
      return;
    }

    statesByEntryId.forEach((state) => {
      supersedePendingRequest(state);
    });
  };

  const getSnapshot = (entryId, scope = "") => {
    const state = statesByEntryId.get(buildStateKey(entryId, scope));

    return state
      ? {
          inFlightRevision: state.inFlight?.revision ?? null,
          pendingRevision: state.pending?.revision ?? null,
          latestRevision: state.latestRevision,
        }
      : {
          inFlightRevision: null,
          pendingRevision: null,
          latestRevision: -1,
        };
  };

  return {
    cancelPending,
    enqueue,
    getSnapshot,
    markLatest,
    nextRevision,
  };
};
