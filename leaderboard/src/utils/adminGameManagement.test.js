import assert from "node:assert/strict";
import test from "node:test";
import { isAdminGameManagementEnabled } from "./adminGameManagement";
import { isSeasonPickLocked } from "./pickWindow";

test("test-season tooling requires an explicit true flag", () => {
  assert.equal(isAdminGameManagementEnabled(undefined), false);
  assert.equal(isAdminGameManagementEnabled({}), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: false }), false);
  assert.equal(isAdminGameManagementEnabled({ isTestSeason: true }), true);
});

test("test-season gating and pick locking remain independent", () => {
  assert.equal(
    isAdminGameManagementEnabled({ status: "locked", isTestSeason: false }),
    false,
  );
  assert.equal(
    isSeasonPickLocked({
      seasonStatus: "open",
      picksLockAt: "2099-01-01T00:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isAdminGameManagementEnabled({ status: "open", isTestSeason: true }),
    true,
  );
});
