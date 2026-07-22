import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setEntryRepositoryDataClientForTests,
  createEntry,
  getEntryById,
  listEntriesForSeason,
  updateEntry,
} from "./entryRepository";

const existingEntry = {
  id: "amplify-entry-id",
  seasonId: "test26",
  owner: "user-sub",
  userProfileId: "profile-id",
  entryName: "Player Entry 1",
  entryNameKey: "player entry 1",
  contactEmail: "player@example.com",
  paymentStatus: null,
  tieBreakerValue: null,
  isDeleted: false,
  createdAt: "2026-07-22T18:00:00.000Z",
  updatedAt: "2026-07-22T18:00:00.000Z",
};

afterEach(() => {
  __setEntryRepositoryDataClientForTests(null);
});

test("createEntry omits id and returns Amplify's generated response ID", async () => {
  let createPayload;
  let createOptions;
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async () => ({ data: [] }),
        create: async (payload, options) => {
          createPayload = payload;
          createOptions = options;
          return { data: existingEntry };
        },
      },
    },
  });

  const result = await createEntry({
    owner: "user-sub",
    seasonId: "test26",
    userProfileId: "profile-id",
    entryName: " Player Entry 1 ",
    contactEmail: " player@example.com ",
  });

  assert.equal(Object.hasOwn(createPayload, "id"), false);
  assert.deepEqual(createPayload, {
    seasonId: "test26",
    owner: "user-sub",
    userProfileId: "profile-id",
    entryName: "Player Entry 1",
    entryNameKey: "player entry 1",
    contactEmail: "player@example.com",
    tieBreakerValue: null,
    isDeleted: false,
  });
  assert.equal(createOptions.authMode, "userPool");
  assert.equal(result.id, "amplify-entry-id");
  assert.equal(result.paymentStatus, "unpaid");
});

test("createEntry preserves Amplify mutation errors", async () => {
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async () => ({ data: [] }),
        create: async () => ({
          data: null,
          errors: [{ message: "Create Entry failed." }],
        }),
      },
    },
  });

  await assert.rejects(
    createEntry({
      owner: "user-sub",
      seasonId: "test26",
      entryName: "Player Entry 1",
      contactEmail: "player@example.com",
    }),
    /Create Entry failed/,
  );
});

test("existing Entry list and get behavior remains unchanged", async () => {
  const calls = [];
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async (options) => {
          calls.push(["list", options]);
          return { data: [existingEntry] };
        },
        get: async (identifier, options) => {
          calls.push(["get", identifier, options]);
          return { data: existingEntry };
        },
      },
    },
  });

  const entries = await listEntriesForSeason({
    owner: "user-sub",
    seasonId: "test26",
  });
  const entry = await getEntryById({
    entryId: "amplify-entry-id",
    owner: "user-sub",
  });

  assert.equal(entries[0].id, "amplify-entry-id");
  assert.equal(entries[0].paymentStatus, "unpaid");
  assert.equal(entry.id, "amplify-entry-id");
  assert.deepEqual(calls[0][1].filter, {
    owner: { eq: "user-sub" },
    seasonId: { eq: "test26" },
    isDeleted: { eq: false },
  });
  assert.deepEqual(calls[1][1], { id: "amplify-entry-id" });
  assert.equal(calls[1][2].authMode, "userPool");
});

test("updateEntry continues using the ID read from the existing Entry", async () => {
  let updatePayload;
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        get: async () => ({ data: existingEntry }),
        update: async (payload) => {
          updatePayload = payload;
          return {
            data: {
              ...existingEntry,
              entryName: payload.entryName,
              entryNameKey: payload.entryNameKey,
            },
          };
        },
      },
    },
  });

  const result = await updateEntry({
    entryId: "amplify-entry-id",
    owner: "user-sub",
    seasonId: "test26",
    entryName: "Player Entry 1",
    contactEmail: "player@example.com",
    tieBreakerValue: 42,
  });

  assert.equal(updatePayload.id, "amplify-entry-id");
  assert.equal(updatePayload.tieBreakerValue, 42);
  assert.deepEqual(updatePayload, {
    id: "amplify-entry-id",
    tieBreakerValue: 42,
  });
  assert.equal(result.id, "amplify-entry-id");
});

test("updateEntry skips the Amplify mutation when no Entry fields changed", async () => {
  let updateCalled = false;
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        get: async () => ({ data: existingEntry }),
        update: async () => {
          updateCalled = true;
          throw new Error("update should not be called");
        },
      },
    },
  });

  const result = await updateEntry({
    entryId: "amplify-entry-id",
    owner: "user-sub",
    seasonId: "test26",
    entryName: "Player Entry 1",
    contactEmail: "player@example.com",
    tieBreakerValue: undefined,
    userProfileId: "profile-id",
  });

  assert.equal(updateCalled, false);
  assert.equal(result.id, "amplify-entry-id");
});
