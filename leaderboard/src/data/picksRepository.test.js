import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  __setPicksRepositoryDependenciesForTests,
  loadEntryPicks,
  saveEntryState,
} from "./picksRepository";

const entry = {
  id: "entry-id",
  seasonId: "test26",
  owner: "user-sub",
  userProfileId: "profile-id",
  entryName: "Player Entry 1",
  contactEmail: "player@example.com",
  tieBreakerValue: null,
  isDeleted: false,
};

const game = {
  id: "game-1",
  seasonId: "test26",
  bowlName: "Example Bowl",
  kickoffAt: "2099-12-31T12:00:00.000Z",
  teamAAbbr: "AAA",
  teamBAbbr: "BBB",
};
const futurePickDeadline = "2099-01-01T12:00:00.000Z";

const createHarness = ({
  initialPicks = [],
  currentEntry = entry,
  createResult,
} = {}) => {
  let picks = initialPicks.map((pick) => ({ ...pick }));
  const calls = {
    create: [],
    update: [],
    entryUpdate: [],
  };
  const dataClient = {
    models: {
      Pick: {
        list: async () => ({ data: picks.map((pick) => ({ ...pick })) }),
        create: async (payload) => {
          calls.create.push(payload);
          if (createResult) {
            return createResult;
          }

          const created = {
            ...payload,
            createdAt: "2026-07-22T19:28:14.158Z",
            updatedAt: "2026-07-22T19:28:14.158Z",
          };
          picks.push(created);
          return { data: created };
        },
        update: async (payload) => {
          calls.update.push(payload);
          picks = picks.map((pick) =>
            pick.id === payload.id ? { ...pick, ...payload } : pick,
          );
          return { data: picks.find((pick) => pick.id === payload.id) };
        },
      },
    },
  };

  __setPicksRepositoryDependenciesForTests({
    dataClient,
    getEntryById: async () => currentEntry,
    listRawSeasonGames: async () => [game],
    updateEntry: async (input) => {
      calls.entryUpdate.push(input);
      return {
        ...currentEntry,
        ...(Object.hasOwn(input, "entryName")
          ? { entryName: input.entryName }
          : {}),
        ...(Object.hasOwn(input, "contactEmail")
          ? { contactEmail: input.contactEmail }
          : {}),
        ...(Object.hasOwn(input, "tieBreakerValue")
          ? { tieBreakerValue: input.tieBreakerValue }
          : {}),
      };
    },
  });

  return { calls };
};

const save = (overrides = {}) =>
  saveEntryState({
    entryId: "entry-id",
    owner: "user-sub",
    seasonId: "test26",
    userProfileId: "profile-id",
    entryName: "Player Entry 1",
    contactEmail: "player@example.com",
    selectionsByGameId: {},
    currentGameIds: ["game-1"],
    tieBreakerRequired: false,
    picksLockAt: futurePickDeadline,
    ...overrides,
  });

afterEach(() => {
  __setPicksRepositoryDependenciesForTests(null);
});

test("selecting a first winner sends a minimal Pick create and no tiebreaker Entry update", async () => {
  const { calls } = createHarness();

  const result = await save({
    selectionsByGameId: { "game-1": "AAA" },
    tieBreakerValue: "",
  });

  assert.deepEqual(calls.create, [
    {
      id: "pick-entry-id-game-1",
      seasonId: "test26",
      entryId: "entry-id",
      gameId: "game-1",
      owner: "user-sub",
      selectedTeam: "AAA",
    },
  ]);
  assert.equal(Object.hasOwn(calls.create[0], "tieBreakerValue"), false);
  assert.deepEqual(calls.entryUpdate, []);
  assert.deepEqual(result.selectionsByGameId, { "game-1": "AAA" });
});

test("changing a winner sends only the Pick id and selectedTeam", async () => {
  const { calls } = createHarness({
    initialPicks: [
      {
        id: "pick-entry-id-game-1",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-1",
        owner: "user-sub",
        selectedTeam: "AAA",
      },
    ],
  });

  const result = await save({
    selectionsByGameId: { "game-1": "BBB" },
    tieBreakerValue: null,
  });

  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "BBB" },
  ]);
  assert.equal(Object.hasOwn(calls.update[0], "tieBreakerValue"), false);
  assert.deepEqual(calls.entryUpdate, []);
  assert.equal(result.selectionsByGameId["game-1"], "BBB");
});

test("undefined and null unset tiebreakers do not produce an Entry mutation", async (t) => {
  for (const tieBreakerValue of [undefined, null]) {
    await t.test(String(tieBreakerValue), async () => {
      const { calls } = createHarness();
      const result = await save({ tieBreakerValue });

      assert.deepEqual(calls.create, []);
      assert.deepEqual(calls.update, []);
      assert.deepEqual(calls.entryUpdate, []);
      assert.equal(result.entry.tieBreakerValue, null);
    });
  }
});

test("a valid tiebreaker is persisted once on Entry and never on Pick", async () => {
  const { calls } = createHarness();

  const result = await save({
    tieBreakerValue: "42",
    tieBreakerGameId: "game-1",
  });

  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
  assert.deepEqual(calls.entryUpdate, [
    {
      entryId: "entry-id",
      owner: "user-sub",
      seasonId: "test26",
      tieBreakerValue: 42,
    },
  ]);
  assert.equal(result.entry.tieBreakerValue, 42);
});

test("a later scheduled game remains editable before the global picksLockAt", async () => {
  const { calls } = createHarness();
  const picksLockAt = "2026-08-02T12:00:00.000Z";

  await save({
    selectionsByGameId: { "game-1": "AAA" },
    picksLockAt,
    now: new Date("2026-08-02T11:59:59.999Z").getTime(),
  });

  assert.equal(game.kickoffAt, "2099-12-31T12:00:00.000Z");
  assert.equal(calls.create.length, 1);
  assert.equal(calls.create[0].selectedTeam, "AAA");
});

test("at exactly picksLockAt all pick and tiebreaker writes are rejected", async () => {
  const { calls } = createHarness();
  const picksLockAt = "2026-08-02T12:00:00.000Z";

  await assert.rejects(
    save({
      selectionsByGameId: { "game-1": "AAA" },
      tieBreakerValue: "42",
      tieBreakerGameId: "game-1",
      picksLockAt,
      now: new Date(picksLockAt).getTime(),
    }),
    /All picks are locked/,
  );

  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
  assert.deepEqual(calls.entryUpdate, []);
});

test("after picksLockAt no player change is persisted", async () => {
  const { calls } = createHarness({
    initialPicks: [
      {
        id: "pick-entry-id-game-1",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-1",
        owner: "user-sub",
        selectedTeam: "AAA",
      },
    ],
  });
  const picksLockAt = "2026-08-02T12:00:00.000Z";

  await assert.rejects(
    save({
      selectionsByGameId: { "game-1": "BBB" },
      tieBreakerValue: "42",
      tieBreakerGameId: "game-1",
      picksLockAt,
      now: new Date("2026-08-02T12:00:00.001Z").getTime(),
    }),
    /All picks are locked/,
  );

  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
  assert.deepEqual(calls.entryUpdate, []);
});

test("Pick create failures are surfaced and do not falsely continue to Entry updates", async () => {
  const { calls } = createHarness({
    createResult: {
      data: null,
      errors: [{ message: "Backend Pick save failed." }],
    },
  });

  await assert.rejects(
    save({
      selectionsByGameId: { "game-1": "AAA" },
      tieBreakerValue: "",
    }),
    /Backend Pick save failed/,
  );
  assert.deepEqual(calls.entryUpdate, []);
});

test("loading after refresh restores a successfully persisted partial pick", async () => {
  createHarness({
    initialPicks: [
      {
        id: "pick-entry-id-game-1",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-1",
        owner: "user-sub",
        selectedTeam: "AAA",
      },
    ],
  });

  const result = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1"],
  });

  assert.deepEqual(result.selectionsByGameId, { "game-1": "AAA" });
  assert.equal(result.picks[0].id, "pick-entry-id-game-1");
});
