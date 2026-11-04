import assert from "node:assert/strict";
import test from "node:test";
import {
  approveVerifiedPlayer,
  assertAdminIdentity,
  isAwaitingApproval,
  isVerifiedRegistration,
} from "./rules.mjs";

const user = {
  UserStatus: "CONFIRMED",
  Attributes: [
    { Name: "email", Value: "new@example.com" },
    { Name: "email_verified", Value: "true" },
  ],
};

test("only confirmed email-verified accounts await approval", () => {
  assert.equal(isVerifiedRegistration(user), true);
  assert.equal(isAwaitingApproval(user, []), true);
  assert.equal(isAwaitingApproval(user, ["player"]), false);
  assert.equal(isAwaitingApproval(user, ["admin"]), false);
  assert.equal(
    isAwaitingApproval({ ...user, UserStatus: "UNCONFIRMED" }, []),
    false,
  );
  assert.equal(isAwaitingApproval({ ...user, Attributes: [] }, []), false);
  assert.equal(
    isVerifiedRegistration({
      UserStatus: "CONFIRMED",
      UserAttributes: user.Attributes,
    }),
    true,
  );
});

test("registration operations require a real admin claim", () => {
  assert.doesNotThrow(() => assertAdminIdentity({ groups: ["admin"] }));
  assert.throws(() => assertAdminIdentity({ groups: ["player"] }));
  assert.throws(() =>
    assertAdminIdentity({ claims: { "cognito:groups": ["player"] } }),
  );
});

test("approval grants only a verified non-admin account and is idempotent", async () => {
  const added = [];
  const base = {
    username: "cognito-sub",
    getUser: async () => user,
    getGroups: async () => [],
    addPlayer: async (name) => added.push(name),
  };
  assert.equal(await approveVerifiedPlayer(base), true);
  assert.deepEqual(added, ["cognito-sub"]);
  assert.equal(
    await approveVerifiedPlayer({ ...base, getGroups: async () => ["player"] }),
    true,
  );
  assert.deepEqual(added, ["cognito-sub"]);
  await assert.rejects(
    approveVerifiedPlayer({
      ...base,
      getUser: async () => ({ ...user, UserStatus: "UNCONFIRMED" }),
    }),
  );
  await assert.rejects(
    approveVerifiedPlayer({ ...base, getGroups: async () => ["admin"] }),
  );
  await assert.rejects(approveVerifiedPlayer({ ...base, username: "" }));
  assert.deepEqual(added, ["cognito-sub"]);
});
