import assert from "node:assert/strict";
import test from "node:test";
import { buildClearProgress } from "./clearProgress.js";

test("clear progress reports acknowledged operations against the actual target", () => {
  assert.deepEqual(buildClearProgress({ completed: 0, total: 48 }), {
    completed: 0,
    total: 48,
    percentage: 0,
  });
  assert.deepEqual(buildClearProgress({ completed: 24, total: 48 }), {
    completed: 24,
    total: 48,
    percentage: 50,
  });
  assert.deepEqual(buildClearProgress({ completed: 48, total: 48 }), {
    completed: 48,
    total: 48,
    percentage: 100,
  });
});

test("partial or invalid clear progress never falsely displays full success", () => {
  assert.deepEqual(buildClearProgress({ completed: 47, total: 48 }), {
    completed: 47,
    total: 48,
    percentage: 98,
  });
  assert.deepEqual(buildClearProgress({ completed: 999, total: 0 }), {
    completed: 0,
    total: 0,
    percentage: 0,
  });
});
