import assert from "node:assert/strict";
import test from "node:test";
import { createLatestLoadGuard } from "./latestLoad.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test("an older poll cannot replace a newer result that finishes first", async () => {
  const guard = createLatestLoadGuard();
  const older = deferred();
  const newer = deferred();
  const applied = [];
  const load = async (request) => {
    const id = guard.start();
    const result = await request.promise;
    if (guard.isCurrent(id)) applied.push(result);
  };
  const first = load(older);
  const second = load(newer);
  newer.resolve("newer persisted data");
  await second;
  older.resolve("older persisted data");
  await first;
  assert.deepEqual(applied, ["newer persisted data"]);
  guard.invalidate();
  assert.equal(guard.isCurrent(2), false);
});
