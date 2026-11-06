import assert from "node:assert/strict";
import test from "node:test";
import { normalizePayoutDraft } from "./AdminPayoutsPage.jsx";

test("admin percentage input converts exact hundredths without floating point drift", () => {
  const tiers = normalizePayoutDraft([
    { position: 1, percent: "33.33", label: "" },
    { position: 2, percent: "66.67", label: "" },
  ]);
  assert.deepEqual(tiers.map((tier) => tier.percentageBasisPoints), [3333, 6667]);
  assert.throws(() => normalizePayoutDraft([
    { position: 1, percent: "99.999", label: "" },
  ]), /two decimal places/);
  assert.throws(() => normalizePayoutDraft([
    { position: 1, percent: "90", label: "" },
  ]), /exactly 100%/);
});
