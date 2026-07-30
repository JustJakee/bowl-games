import assert from "node:assert/strict";
import test from "node:test";
import {
  selectCanonicalEntriesByUser,
  selectCanonicalEntry,
  runSingleFlight,
} from "./canonicalEntry.js";

const entry = (id, values = {}) => ({
  id,
  owner: "owner-a",
  seasonId: "season-a",
  isDeleted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...values,
});

test("no entries returns null", () => {
  assert.equal(selectCanonicalEntry(), null);
});

test("one active entry returns that entry", () => {
  assert.equal(selectCanonicalEntry({ entries: [entry("one")] })?.id, "one");
});

test("latest pick activity selects the most recently edited legacy entry", () => {
  const entries = [
    entry("entry-a", { updatedAt: "2026-01-03T00:00:00.000Z" }),
    entry("entry-b", { updatedAt: "2026-01-02T00:00:00.000Z" }),
  ];
  const picks = [
    {
      entryId: "entry-b",
      updatedAt: "2026-01-04T00:00:00.000Z",
    },
  ];

  assert.equal(selectCanonicalEntry({ entries, picks })?.id, "entry-b");
});

test("deleted and other-season entries are ignored", () => {
  const entries = [
    entry("deleted", {
      isDeleted: true,
      updatedAt: "2026-02-01T00:00:00.000Z",
    }),
    entry("other-season", {
      seasonId: "season-b",
      updatedAt: "2026-03-01T00:00:00.000Z",
    }),
    entry("active"),
  ];

  assert.equal(
    selectCanonicalEntry({ entries, seasonId: "season-a" })?.id,
    "active",
  );
});

test("an entry with a missing legacy delete flag remains eligible", () => {
  assert.equal(
    selectCanonicalEntry({
      entries: [entry("legacy", { isDeleted: null })],
      seasonId: "season-a",
    })?.id,
    "legacy",
  );
});

test("authenticated owner filtering rejects another user's entry", () => {
  const result = selectCanonicalEntry({
    entries: [
      entry("mine", { owner: "owner-a" }),
      entry("theirs", {
        owner: "owner-b",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ],
    owner: "owner-a",
    seasonId: "season-a",
  });

  assert.equal(result?.id, "mine");
});

test("timestamp ties use stable entry ID comparison", () => {
  assert.equal(
    selectCanonicalEntry({ entries: [entry("z"), entry("a")] })?.id,
    "a",
  );
});

test("missing and invalid timestamps do not crash selection", () => {
  const result = selectCanonicalEntry({
    entries: [
      entry("b", { createdAt: null, updatedAt: "invalid" }),
      entry("a", { createdAt: undefined, updatedAt: undefined }),
    ],
  });

  assert.equal(result?.id, "a");
});

test("canonical collection contains one entry per user", () => {
  const entries = [
    entry("a-old", {
      userProfile: { id: "profile-a" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    entry("a-new", {
      userProfile: { id: "profile-a" },
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    entry("b", {
      owner: "owner-b",
      userProfile: { id: "profile-b" },
    }),
  ];

  assert.deepEqual(
    selectCanonicalEntriesByUser({ entries }).map(({ id }) => id).sort(),
    ["a-new", "b"],
  );
});

test("username alone is not used to merge different players", () => {
  const entries = [
    entry("one", {
      owner: null,
      userProfile: { username: "Shared Name" },
    }),
    entry("two", {
      owner: null,
      userProfile: { username: "Shared Name" },
    }),
  ];

  assert.deepEqual(
    selectCanonicalEntriesByUser({ entries }).map(({ id }) => id).sort(),
    ["one", "two"],
  );
});

test("single-flight creation prevents double-click duplicate operations", async () => {
  const promiseRef = { current: null };
  let createCount = 0;
  const operation = async () => {
    createCount += 1;
    await Promise.resolve();
    return { id: "one-pick-set" };
  };

  const [first, second] = await Promise.all([
    runSingleFlight(promiseRef, operation),
    runSingleFlight(promiseRef, operation),
  ]);

  assert.equal(createCount, 1);
  assert.equal(first.id, "one-pick-set");
  assert.equal(second.id, "one-pick-set");
  assert.equal(promiseRef.current, null);
});
