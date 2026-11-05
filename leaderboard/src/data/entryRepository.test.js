import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { parse } from "graphql";
import { customOpFactory } from "../../node_modules/@aws-amplify/data-schema/dist/esm/runtime/internals/operations/custom.mjs";
import { indexQueryFactory } from "../../node_modules/@aws-amplify/data-schema/dist/esm/runtime/internals/operations/indexQuery.mjs";
import {
  __setEntryRepositoryDataClientForTests,
  ENTRY_SELECTION,
  createOrLoadEntry,
  createEntry,
  getCanonicalEntryForUser,
  getEntryById,
  listEntriesForSeason,
  softDeleteEntry,
  updateEntry,
  runSecureEntryMutation,
} from "./entryRepository";

const entry = {
  id: "entry-one",
  seasonId: "test26-r2",
  owner: "player-one",
  userProfileId: "profile-one",
  entryName: "Legacy entry",
  entryNameKey: "legacy entry",
  contactEmail: "player@example.com",
  paymentStatus: null,
  tieBreakerValue: null,
  isDeleted: false,
  createdAt: "2026-11-03T20:00:00Z",
  updatedAt: "2026-11-03T20:00:00Z",
};
const input = {
  owner: "player-one",
  seasonId: "test26-r2",
  contactEmail: "player@example.com",
  userProfileId: "profile-one",
};
afterEach(() => __setEntryRepositoryDataClientForTests(null));

const harness = ({ entries = [entry], picks = [] } = {}) => {
  const calls = { reads: [], gets: [], mutations: [], picks: [] };
  const client = {
    models: {
      Entry: {
        get: async (key, options) => {
          calls.gets.push({ key, options });
          const row = entries.find((e) => e.id === key.id);
          if (row && row.owner !== "player-one")
            return {
              data: null,
              errors: [
                {
                  message:
                    "Not authorized to access contactEmail on type Entry",
                },
              ],
            };
          if (!row) return { data: null };
          const { owner: _owner, ...data } = row;
          return { data };
        },
        entriesByOwner: async (key, options) => {
          calls.reads.push({ key, options });
          const rows = entries.filter(
            (e) =>
              e.owner === key.owner &&
              (!key.seasonId || e.seasonId === key.seasonId.eq) &&
              (!options.filter?.id || e.id === options.filter.id.eq),
          );
          return {
            data: rows.map(({ owner: _owner, ...publicEntry }) => publicEntry),
          };
        },
      },
      Pick: {
        list: async (options) => {
          calls.picks.push(options);
          return { data: picks };
        },
      },
    },
    mutations: {
      createSeasonEntry: async (args, options) => {
        calls.mutations.push({ operation: "createSeasonEntry", args, options });
        return {
          data: { ...entry, entryName: "jake_picks_2026", owner: undefined },
        };
      },
      updateSeasonEntry: async (args, options) => {
        calls.mutations.push({ operation: "updateSeasonEntry", args, options });
        return { data: { ...entry, ...args, owner: undefined } };
      },
    },
  };
  client.graphql = async ({ query, variables, authMode }) => {
    const field = parse(query).definitions[0].selectionSet.selections[0];
    const result = await client.mutations[field.name.value](variables, {
      authMode,
      selectionSet: field.selectionSet.selections.map(
        (item) => item.name.value,
      ),
    });
    return { data: { [field.name.value]: result.data }, errors: result.errors };
  };
  __setEntryRepositoryDataClientForTests(client);
  return { client, calls };
};

test("approved player with no entry gets an empty result only after successful owner/season reads", async () => {
  const { calls } = harness({ entries: [] });
  assert.equal(await getCanonicalEntryForUser(input), null);
  assert.deepEqual(calls.reads[0].key, {
    owner: "player-one",
    seasonId: { eq: "test26-r2" },
  });
  assert.equal(calls.reads[0].options.authMode, "userPool");
  assert.deepEqual(calls.picks[0].filter, {
    owner: { eq: "player-one" },
    seasonId: { eq: "test26-r2" },
  });
  assert.equal(calls.mutations.length, 0);
  assert.equal(ENTRY_SELECTION.includes("owner"), false);
});

test("own-entry reads restore local scope without selecting the protected owner field", async () => {
  const { calls } = harness();
  const own = await getEntryById({ entryId: entry.id, ...input });
  assert.equal(own.id, entry.id);
  assert.equal(own.owner, "player-one");
  assert.equal(own.paymentStatus, null);
  assert.deepEqual(calls.gets[0].key, { id: entry.id });
  assert.ok(
    calls.gets.every((call) => !call.options.selectionSet.includes("owner")),
  );
});

test("other players and August entries cannot be returned by the current player's season lookup", async () => {
  harness({
    entries: [
      entry,
      { ...entry, id: "foreign", owner: "player-two" },
      { ...entry, id: "august", seasonId: "test26" },
    ],
  });
  assert.deepEqual(
    (await listEntriesForSeason(input)).map((e) => e.id),
    [entry.id],
  );
  await assert.rejects(
    getEntryById({ ...input, entryId: "foreign" }),
    /Not authorized/,
  );
  await assert.rejects(
    getEntryById({ ...input, entryId: "august" }),
    /not found or is not yours/,
  );
});

test("missing authorization and GraphQL field errors fail closed instead of appearing empty", async () => {
  const { client } = harness({ entries: [] });
  await assert.rejects(
    getCanonicalEntryForUser({ seasonId: "test26-r2" }),
    /signed in/,
  );
  client.models.Entry.entriesByOwner = async () => ({
    data: [],
    errors: [{ message: "Not Authorized to access owner on type Entry" }],
  });
  await assert.rejects(
    createOrLoadEntry(input),
    /Not Authorized to access owner/,
  );
  client.models.Entry.entriesByOwner = async () => ({ data: [] });
  client.models.Pick.list = async () => ({
    data: [],
    errors: [{ message: "Invalid token" }],
  });
  await assert.rejects(createOrLoadEntry(input), /Invalid token/);
  client.models.Pick.list = async () => ({ data: [] });
  client.models.Entry.entriesByOwner = async () => ({ data: null });
  await assert.rejects(createOrLoadEntry(input), /Unable to load your entry/);
});

test("legacy null deletion flags and paginated reads remain compatible", async () => {
  const { client } = harness();
  const tokens = [];
  client.models.Entry.entriesByOwner = async (_key, options) => {
    tokens.push(options.nextToken);
    return options.nextToken
      ? { data: [{ ...entry, isDeleted: null }] }
      : { data: [{ ...entry, isDeleted: true }], nextToken: "more" };
  };
  assert.equal((await listEntriesForSeason(input)).length, 1);
  assert.deepEqual(tokens, [undefined, "more"]);
});

test("canonical legacy selection retains latest pick activity", async () => {
  harness({
    entries: [
      entry,
      { ...entry, id: "recent-picks", updatedAt: "2026-11-02T20:00:00Z" },
    ],
    picks: [{ entryId: "recent-picks", updatedAt: "2026-11-03T21:00:00Z" }],
  });
  assert.equal((await getCanonicalEntryForUser(input)).id, "recent-picks");
});

test("creation invokes guarded mutation with no client name, username, owner, or payment authority", async () => {
  const { calls } = harness({ entries: [] });
  const created = await createOrLoadEntry({
    ...input,
    entryName: "Forged",
    username: "attacker",
    paymentStatus: "paid",
  });
  assert.equal(created.entryName, "jake_picks_2026");
  assert.deepEqual(calls.mutations[0].args, {
    seasonId: "test26-r2",
    contactEmail: "player@example.com",
    userProfileId: "profile-one",
  });
  assert.equal(calls.mutations[0].operation, "createSeasonEntry");
  assert.equal(calls.mutations[0].options.authMode, "userPool");
  assert.equal(
    calls.mutations[0].options.selectionSet.includes("owner"),
    false,
  );
});

test("existing entry is reused on refresh/retry without creation or renaming", async () => {
  const { calls } = harness();
  for (let i = 0; i < 2; i++)
    assert.equal((await createOrLoadEntry(input)).entryName, "Legacy entry");
  assert.equal(calls.mutations.length, 0);
});

test("mutation failures retain their actual message and permit a safe lookup on retry", async () => {
  const { client, calls } = harness({ entries: [] });
  client.mutations.createSeasonEntry = async () => ({
    data: null,
    errors: [{ message: "Picks are locked" }],
  });
  await assert.rejects(createEntry(input), /Picks are locked/);
  client.models.Entry.entriesByOwner = async () => ({ data: [entry] });
  assert.equal((await createOrLoadEntry(input)).id, entry.id);
  assert.equal(calls.mutations.length, 0);
});

test("updates preserve legacy names and send only changed guarded values", async () => {
  const { calls } = harness();
  const updated = await updateEntry({
    ...input,
    entryId: entry.id,
    entryName: "Forbidden rename",
    tieBreakerValue: 42,
  });
  assert.equal(updated.entryName, "Legacy entry");
  assert.deepEqual(calls.mutations[0].args, {
    entryId: entry.id,
    tieBreakerValue: 42,
  });
  assert.equal(calls.mutations[0].operation, "updateSeasonEntry");
});

test("another player's entry cannot be updated", async () => {
  const { calls } = harness({ entries: [{ ...entry, owner: "other" }] });
  await assert.rejects(
    updateEntry({ ...input, entryId: entry.id, tieBreakerValue: 42 }),
    /Not authorized/,
  );
  assert.equal(calls.mutations.length, 0);
});

test("unchanged entry fields skip mutations and locked deletion remains prohibited", async () => {
  const { calls } = harness();
  await updateEntry({ ...input, entryId: entry.id, tieBreakerValue: null });
  await assert.rejects(
    softDeleteEntry({ ...input, entryId: entry.id, picksLocked: true }),
    /after picks lock/,
  );
  assert.equal(calls.mutations.length, 0);
});

const model = {
  name: "Entry",
  pluralName: "Entries",
  syncable: false,
  primaryKeyInfo: {
    isCustomPrimaryKey: false,
    primaryKeyFieldName: "id",
    sortKeyFieldNames: [],
  },
  fields: Object.fromEntries(
    [...ENTRY_SELECTION, "owner"].map((name) => [
      name,
      {
        name,
        type: ["id", "seasonId", "userProfileId"].includes(name)
          ? "ID"
          : "String",
        isArray: false,
      },
    ]),
  ),
  attributes: [],
};
const introspection = { models: { Entry: model }, enums: {}, nonModels: {} };

test("actual Amplify index generator keeps owner and season on the wire without selecting Entry.owner", async () => {
  const requests = [];
  const graphql = {
    graphql: async (request) => {
      requests.push(request);
      return { data: { entriesByOwner: { items: [], nextToken: null } } };
    },
  };
  const index = indexQueryFactory(
    graphql,
    introspection,
    model,
    { queryField: "entriesByOwner", pk: "owner", sk: ["seasonId"] },
    () => ({}),
  );
  __setEntryRepositoryDataClientForTests({
    models: { Entry: { entriesByOwner: index } },
  });
  assert.deepEqual(await listEntriesForSeason(input), []);
  assert.equal(requests[0].variables.owner, "player-one");
  assert.deepEqual(requests[0].variables.seasonId, { eq: "test26-r2" });
  const root = parse(requests[0].query).definitions[0].selectionSet
    .selections[0];
  const items = root.selectionSet.selections.find(
    (field) => field.name.value === "items",
  );
  assert.equal(
    items.selectionSet.selections.some((field) => field.name.value === "owner"),
    false,
  );
});

test("installed custom-operation generator reproduces ignored selectionSet; explicit guarded GraphQL fixes it", async () => {
  const requests = [];
  const graphql = {
    graphql: async (request) => {
      requests.push(request);
      return { data: { createSeasonEntry: entry } };
    },
  };
  const legacy = customOpFactory(
    graphql,
    introspection,
    "mutation",
    {
      name: "createSeasonEntry",
      type: { model: "Entry" },
      isArray: false,
      arguments: {
        seasonId: {
          name: "seasonId",
          type: "ID",
          isArray: false,
          isRequired: true,
        },
      },
    },
    false,
    () => ({}),
  );
  await legacy(
    { seasonId: "test26-r2" },
    { selectionSet: ENTRY_SELECTION, authMode: "userPool" },
  );
  const oldFields = parse(requests[0].query).definitions[0].selectionSet
    .selections[0].selectionSet.selections;
  assert.ok(
    oldFields.some((field) => field.name.value === "owner"),
    "Regression reproduction: SDK silently adds owner",
  );
  await runSecureEntryMutation(graphql, "createSeasonEntry", {
    ...input,
    entryName: "spoof",
    username: "spoof",
  });
  const newFields = parse(requests[1].query).definitions[0].selectionSet
    .selections[0].selectionSet.selections;
  assert.equal(
    newFields.some((field) => field.name.value === "owner"),
    false,
  );
  assert.deepEqual(Object.keys(requests[1].variables).sort(), [
    "contactEmail",
    "seasonId",
    "userProfileId",
  ]);
  assert.equal(requests[1].authMode, "userPool");
});
