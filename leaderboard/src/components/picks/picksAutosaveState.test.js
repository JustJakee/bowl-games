import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAutosaveDiagnostic,
  buildAutosaveFailureState,
  buildAutosaveSuccessState,
  buildSyncedDraft,
  createPerEntryAutosaveCoordinator,
  getDraftRevision,
  isDraftCacheReady,
  isDraftSyncedWithBackend,
  shouldApplyPickSaveResult,
} from "./picksAutosaveState";

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

const waitFor = async (predicate) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setImmediate(resolve));
  }

  assert.fail("Timed out waiting for the autosave coordinator.");
};

test("a successful backend save replaces the pending draft with synchronized data", () => {
  const draft = buildSyncedDraft({
    entry: {
      entryName: "Player Entry 1",
      tieBreakerValue: null,
    },
    selectionsByGameId: { "game-1": "AAA" },
  });

  assert.deepEqual(draft, {
    entryName: "Player Entry 1",
    selectionsByGameId: { "game-1": "AAA" },
    tieBreakerValue: "",
    revision: 0,
    dirty: false,
  });
  assert.deepEqual(buildAutosaveSuccessState(), {
    state: "saved",
    message: "Saved to account",
    detail: "",
  });
});

test("a failed backend save remains visibly device-only instead of reporting success", () => {
  assert.deepEqual(buildAutosaveFailureState(new Error("Save rejected.")), {
    state: "device",
    message: "Saved to device",
    detail: "Save rejected.",
  });
  assert.deepEqual(
    buildAutosaveFailureState(
      Object.assign(new Error("Save rejected."), {
        correlationId: "correlation-1",
      }),
    ),
    {
      state: "device",
      message: "Saved to device",
      detail: "Save rejected. Reference: correlation-1.",
    },
  );
});

test("autosave diagnostics retain safe mutation context for testing", () => {
  const error = Object.assign(new Error("The conditional request failed."), {
    name: "PickPersistenceError",
    correlationId: "correlation-1",
    entryId: "entry-a",
    gameId: "game-1",
    pickId: "pick-entry-a-game-1",
    selectedTeam: "AAA",
    operation: "create",
    graphQLErrors: [
      {
        message: "The conditional request failed.",
        path: ["createPick"],
        errorType: "DynamoDB:ConditionalCheckFailedException",
      },
    ],
    returnedData: null,
  });

  const diagnostic = buildAutosaveDiagnostic({
    error,
    entryId: "entry-a",
    revision: 4,
    localSelectionCount: 48,
  });

  assert.equal(Number.isNaN(Date.parse(diagnostic.timestamp)), false);
  assert.deepEqual(
    { ...diagnostic, timestamp: "normalized" },
    {
      correlationId: "correlation-1",
      timestamp: "normalized",
      entryId: "entry-a",
      revision: 4,
      gameId: "game-1",
      pickId: "pick-entry-a-game-1",
      selectedTeam: "AAA",
      operation: "create",
      graphQLErrors: [
        {
          message: "The conditional request failed.",
          path: ["createPick"],
          errorType: "DynamoDB:ConditionalCheckFailedException",
        },
      ],
      returnedData: null,
      thrownError: {
        name: "PickPersistenceError",
        message: "The conditional request failed.",
      },
      localSelectionCount: 48,
      cloudSaveCompleted: false,
    },
  );
});

test("legacy dirty drafts receive a saveable revision", () => {
  assert.equal(getDraftRevision(null), 0);
  assert.equal(getDraftRevision({ dirty: false }), 0);
  assert.equal(getDraftRevision({ dirty: true }), 1);
  assert.equal(getDraftRevision({ dirty: true, revision: 7 }), 7);
});

test("clean backend-equivalent drafts bail out of hydration updates", () => {
  const backendDraft = {
    entryName: "Entry A",
    selectionsByGameId: {
      "game-1": "AAA",
      "game-2": "BBB",
    },
    tieBreakerValue: "42",
  };

  assert.equal(
    isDraftSyncedWithBackend(
      {
        ...backendDraft,
        revision: 3,
        dirty: false,
      },
      backendDraft,
    ),
    true,
  );
  assert.equal(
    isDraftSyncedWithBackend(
      {
        ...backendDraft,
        selectionsByGameId: { "game-1": "AAA" },
        dirty: false,
      },
      backendDraft,
    ),
    false,
  );
  assert.equal(
    isDraftSyncedWithBackend(
      {
        ...backendDraft,
        dirty: true,
      },
      backendDraft,
    ),
    false,
  );
});

test("draft persistence waits until the requested storage scope is loaded", () => {
  assert.equal(isDraftCacheReady("", "owner-a:season-1"), false);
  assert.equal(
    isDraftCacheReady("owner-a:season-1", "owner-b:season-1"),
    false,
  );
  assert.equal(
    isDraftCacheReady("owner-a:season-1", "owner-a:season-1"),
    true,
  );
});

test("autosave serializes one entry and coalesces intermediate revisions", async () => {
  const deferredByRevision = new Map();
  const startedRevisions = [];
  const successfulRevisions = [];
  const coordinator = createPerEntryAutosaveCoordinator({
    save: ({ revision }) => {
      const deferred = createDeferred();
      deferredByRevision.set(revision, deferred);
      startedRevisions.push(revision);
      return deferred.promise;
    },
    onSuccess: ({ revision }) => successfulRevisions.push(revision),
  });

  const first = coordinator.enqueue({ entryId: "entry-a", revision: 1 });
  const second = coordinator.enqueue({ entryId: "entry-a", revision: 2 });
  const third = coordinator.enqueue({ entryId: "entry-a", revision: 3 });

  assert.deepEqual(startedRevisions, [1]);
  assert.deepEqual(await second, {
    status: "superseded",
    entryId: "entry-a",
    revision: 2,
  });

  deferredByRevision.get(1).resolve({ savedRevision: 1 });
  assert.equal((await first).status, "superseded");
  await waitFor(() => deferredByRevision.has(3));
  assert.deepEqual(startedRevisions, [1, 3]);

  deferredByRevision.get(3).resolve({ savedRevision: 3 });
  const latestOutcome = await third;

  assert.equal(latestOutcome.status, "saved");
  assert.deepEqual(latestOutcome.result, { savedRevision: 3 });
  assert.deepEqual(successfulRevisions, [3]);
  assert.deepEqual(coordinator.getSnapshot("entry-a"), {
    inFlightRevision: null,
    pendingRevision: null,
    latestRevision: 3,
  });
});

test("a failed older save does not prevent the newest revision from draining", async () => {
  const deferredByRevision = new Map();
  const coordinator = createPerEntryAutosaveCoordinator({
    save: ({ revision }) => {
      const deferred = createDeferred();
      deferredByRevision.set(revision, deferred);
      return deferred.promise;
    },
  });

  const first = coordinator.enqueue({ entryId: "entry-a", revision: 1 });
  const latest = coordinator.enqueue({ entryId: "entry-a", revision: 2 });

  deferredByRevision.get(1).reject(new Error("First save failed."));
  assert.equal((await first).status, "superseded");
  await waitFor(() => deferredByRevision.has(2));

  deferredByRevision.get(2).resolve({ savedRevision: 2 });
  assert.equal((await latest).status, "saved");
});

test("different entries may save independently", async () => {
  const deferredByEntryId = new Map();
  const coordinator = createPerEntryAutosaveCoordinator({
    save: ({ entryId }) => {
      const deferred = createDeferred();
      deferredByEntryId.set(entryId, deferred);
      return deferred.promise;
    },
  });

  const entryA = coordinator.enqueue({ entryId: "entry-a", revision: 1 });
  const entryB = coordinator.enqueue({ entryId: "entry-b", revision: 1 });

  assert.deepEqual([...deferredByEntryId.keys()], ["entry-a", "entry-b"]);
  deferredByEntryId.get("entry-a").resolve({ entryId: "entry-a" });
  deferredByEntryId.get("entry-b").resolve({ entryId: "entry-b" });

  assert.equal((await entryA).status, "saved");
  assert.equal((await entryB).status, "saved");
});

test("the same entry and revision are isolated across account-season scopes", async () => {
  const deferredByScope = new Map();
  const coordinator = createPerEntryAutosaveCoordinator({
    save: ({ scope }) => {
      const deferred = createDeferred();
      deferredByScope.set(scope, deferred);
      return deferred.promise;
    },
  });

  const firstScope = coordinator.enqueue({
    entryId: "entry-a",
    revision: 1,
    scope: "owner-a:season-1",
  });
  const secondScope = coordinator.enqueue({
    entryId: "entry-a",
    revision: 1,
    scope: "owner-b:season-1",
  });

  assert.deepEqual(
    [...deferredByScope.keys()],
    ["owner-a:season-1", "owner-b:season-1"],
  );
  deferredByScope
    .get("owner-a:season-1")
    .resolve({ scope: "owner-a:season-1" });
  deferredByScope
    .get("owner-b:season-1")
    .resolve({ scope: "owner-b:season-1" });

  assert.equal((await firstScope).status, "saved");
  assert.equal((await secondScope).status, "saved");
});

test("revision allocation stays monotonic after a remount or cleared draft cache", () => {
  const coordinator = createPerEntryAutosaveCoordinator({
    save: async () => ({}),
  });

  coordinator.markLatest(
    "entry-a",
    12,
    "owner-a:season-1",
  );

  assert.equal(
    coordinator.nextRevision(
      "entry-a",
      0,
      "owner-a:season-1",
    ),
    13,
  );
  assert.equal(
    coordinator.nextRevision(
      "entry-a",
      2,
      "owner-a:season-1",
    ),
    14,
  );
  assert.equal(
    coordinator.nextRevision(
      "entry-a",
      0,
      "owner-b:season-1",
    ),
    1,
  );
});

test("a newly marked revision prevents an older response from reporting success", async () => {
  const deferred = createDeferred();
  let successCount = 0;
  const coordinator = createPerEntryAutosaveCoordinator({
    save: () => deferred.promise,
    onSuccess: () => {
      successCount += 1;
    },
  });

  const first = coordinator.enqueue({ entryId: "entry-a", revision: 1 });
  coordinator.markLatest("entry-a", 2);
  deferred.resolve({ savedRevision: 1 });

  assert.equal((await first).status, "superseded");
  assert.equal(successCount, 0);
});

test("a rejected response stays failed and does not report the draft as saved", async () => {
  const coordinator = createPerEntryAutosaveCoordinator({
    save: async () => ({ entry: { id: "wrong-entry" } }),
    onSuccess: () => false,
  });

  const outcome = await coordinator.enqueue({
    entryId: "entry-a",
    revision: 1,
  });

  assert.equal(outcome.status, "failed");
  assert.match(outcome.error.message, /did not match/);
});

test("latest-save and callback failures always settle their enqueue promises", async () => {
  const saveError = new Error("Latest save failed.");
  const coordinator = createPerEntryAutosaveCoordinator({
    save: async () => {
      throw saveError;
    },
    onError: () => {
      throw new Error("Error callback failed.");
    },
  });

  const outcome = await coordinator.enqueue({
    entryId: "entry-a",
    revision: 1,
  });

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.error, saveError);
  assert.match(outcome.callbackError.message, /callback failed/);
});

test("save results only apply to the matching active entry and account-season scope", () => {
  const matchingInput = {
    activeEntryId: "entry-a",
    requestedEntryId: "entry-a",
    resultEntryId: "entry-a",
    currentScope: "owner-a:season-1",
    requestScope: "owner-a:season-1",
  };

  assert.equal(shouldApplyPickSaveResult(matchingInput), true);
  assert.equal(
    shouldApplyPickSaveResult({
      ...matchingInput,
      activeEntryId: "entry-b",
    }),
    false,
  );
  assert.equal(
    shouldApplyPickSaveResult({
      ...matchingInput,
      resultEntryId: "entry-b",
    }),
    false,
  );
  assert.equal(
    shouldApplyPickSaveResult({
      ...matchingInput,
      currentScope: "owner-b:season-1",
    }),
    false,
  );
  assert.equal(
    shouldApplyPickSaveResult({
      ...matchingInput,
      requestScope: "",
    }),
    false,
  );
});
