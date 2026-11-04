import assert from "node:assert/strict";
import test from "node:test";
import {
  getRandomizeFeedback,
  RANDOMIZE_PHASE,
  runRandomizeLifecycle,
} from "./randomizeFeedback.js";

const createDeferred = () => {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

test("randomize feedback exposes accessible loading labels for both processing phases", () => {
  assert.deepEqual(
    getRandomizeFeedback({
      phase: RANDOMIZE_PHASE.RANDOMIZING,
      idleLabel: "Randomize All Picks",
    }),
    { isProcessing: true, label: "Randomizing picks..." },
  );
  assert.deepEqual(
    getRandomizeFeedback({
      phase: RANDOMIZE_PHASE.SAVING,
      idleLabel: "Randomize Remaining Picks",
    }),
    { isProcessing: true, label: "Saving picks..." },
  );
  assert.deepEqual(
    getRandomizeFeedback({
      phase: RANDOMIZE_PHASE.IDLE,
      idleLabel: "Randomize All Picks",
    }),
    { isProcessing: false, label: "Randomize All Picks" },
  );
  assert.deepEqual(
    getRandomizeFeedback({
      phase: RANDOMIZE_PHASE.IDLE,
      idleLabel: "Randomize Remaining Picks",
    }),
    { isProcessing: false, label: "Randomize Remaining Picks" },
  );
});

test("randomize lifecycle starts immediately, blocks duplicates, and clears after success", async () => {
  const deferred = createDeferred();
  const phases = [];
  const lockRef = { current: false };
  let createCount = 0;
  let persistCount = 0;
  const options = {
    lockRef,
    createSelections: () => {
      createCount += 1;
      return { "game-1": "AAA" };
    },
    persistSelections: async () => {
      persistCount += 1;
      return deferred.promise;
    },
    onPhaseChange: (phase) => phases.push(phase),
  };

  const first = runRandomizeLifecycle(options);
  const duplicate = await runRandomizeLifecycle(options);

  assert.deepEqual(phases, [
    RANDOMIZE_PHASE.RANDOMIZING,
    RANDOMIZE_PHASE.SAVING,
  ]);
  assert.equal(lockRef.current, true);
  assert.equal(createCount, 1);
  assert.equal(persistCount, 1);
  assert.deepEqual(duplicate, { status: "ignored" });

  deferred.resolve({ status: "saved" });
  assert.deepEqual(await first, { status: "saved" });
  assert.equal(lockRef.current, false);
  assert.equal(phases.at(-1), RANDOMIZE_PHASE.IDLE);
});

test("randomize lifecycle clears loading feedback after persistence failure", async () => {
  const phases = [];
  const lockRef = { current: false };
  const result = await runRandomizeLifecycle({
    lockRef,
    createSelections: () => ({ "game-1": "AAA" }),
    persistSelections: async () => ({ status: "failed" }),
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.deepEqual(result, { status: "failed" });
  assert.deepEqual(phases, [
    RANDOMIZE_PHASE.RANDOMIZING,
    RANDOMIZE_PHASE.SAVING,
    RANDOMIZE_PHASE.IDLE,
  ]);
  assert.equal(lockRef.current, false);
  assert.deepEqual(
    getRandomizeFeedback({
      phase: phases.at(-1),
      idleLabel: "Randomize Remaining Picks",
    }),
    { isProcessing: false, label: "Randomize Remaining Picks" },
  );
});
