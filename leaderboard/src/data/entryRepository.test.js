import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setEntryRepositoryDataClientForTests,
  createOrLoadEntry,
  createEntry,
  getCanonicalEntryForUser,
  getEntryById,
  listEntriesForSeason,
  softDeleteEntry,
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
  });
  assert.deepEqual(calls[1][1], { id: "amplify-entry-id" });
  assert.equal(calls[1][2].authMode, "userPool");
});

test("listEntriesForSeason paginates and retains legacy null delete flags", async () => {
  const calls = [];
  const legacyEntry = {
    ...existingEntry,
    id: "legacy-entry",
    isDeleted: null,
  };

  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async (input) => {
          calls.push(input);
          return input.nextToken
            ? { data: [legacyEntry], nextToken: null }
            : {
                data: [{ ...existingEntry, isDeleted: true }],
                nextToken: "next-page",
              };
        },
      },
    },
  });

  const entries = await listEntriesForSeason({
    owner: "user-sub",
    seasonId: "test26",
  });

  assert.deepEqual(entries.map(({ id }) => id), ["legacy-entry"]);
  assert.deepEqual(
    calls.map(({ nextToken }) => nextToken),
    [undefined, "next-page"],
  );
});

test("getCanonicalEntryForUser uses latest Pick activity across legacy entries", async () => {
  const olderEntry = {
    ...existingEntry,
    id: "older-entry",
    updatedAt: "2026-07-22T20:00:00.000Z",
  };
  const activeEntry = {
    ...existingEntry,
    id: "active-entry",
    entryName: "Most Recent Picks",
    updatedAt: "2026-07-22T19:00:00.000Z",
  };

  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async () => ({ data: [olderEntry, activeEntry] }),
      },
      Pick: {
        list: async () => ({
          data: [
            {
              id: "pick-active",
              seasonId: "test26",
              entryId: "active-entry",
              updatedAt: "2026-07-22T21:00:00.000Z",
            },
          ],
        }),
      },
    },
  });

  const result = await getCanonicalEntryForUser({
    owner: "user-sub",
    seasonId: "test26",
  });

  assert.equal(result.id, "active-entry");
});

test("createOrLoadEntry loads an existing pick set instead of creating another", async () => {
  let createCalled = false;
  __setEntryRepositoryDataClientForTests({
    models: {
      Entry: {
        list: async () => ({ data: [existingEntry] }),
        create: async () => {
          createCalled = true;
          throw new Error("create should not be called");
        },
      },
      Pick: {
        list: async () => ({ data: [] }),
      },
    },
  });

  const result = await createOrLoadEntry({
    owner: "user-sub",
    seasonId: "test26",
    entryName: "Another Entry",
    contactEmail: "player@example.com",
  });

  assert.equal(result.id, existingEntry.id);
  assert.equal(createCalled, false);
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

test("softDeleteEntry marks the existing Entry as deleted without removing it", async () => {
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
              isDeleted: true,
            },
          };
        },
      },
    },
  });

  const result = await softDeleteEntry({
    entryId: "amplify-entry-id",
    owner: "user-sub",
    picksLocked: false,
  });

  assert.deepEqual(updatePayload, {
    id: "amplify-entry-id",
    isDeleted: true,
  });
  assert.equal(result.isDeleted, true);
  assert.equal(result.id, "amplify-entry-id");
});

test("softDeleteEntry is blocked after picks lock", async () => {
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

  await assert.rejects(
    softDeleteEntry({
      entryId: "amplify-entry-id",
      owner: "user-sub",
      picksLocked: true,
    }),
    /no longer be deleted/,
  );

  assert.equal(updateCalled, false);
});
