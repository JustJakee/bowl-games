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
const secondGame = {
  ...game,
  id: "game-2",
  bowlName: "Second Bowl",
  teamAAbbr: "CCC",
  teamBAbbr: "DDD",
};
const futurePickDeadline = "2099-01-01T12:00:00.000Z";

const createHarness = ({
  initialPicks = [],
  currentEntry = entry,
  createResult,
  deleteResult,
  pickPageSize = 100,
  seasonGames = [game],
} = {}) => {
  let picks = initialPicks.map((pick) => ({ ...pick }));
  const calls = {
    create: [],
    delete: [],
    pickByEntryAndGame: [],
    update: [],
    entryUpdate: [],
  };
  const dataClient = {
    models: {
      Pick: {
        pickByEntryAndGame: async (input, options = {}) => {
          calls.pickByEntryAndGame.push({ input, options });
          const offset = options.nextToken
            ? Number(String(options.nextToken).replace("offset-", ""))
            : 0;
          const matchingPicks = picks.filter(
            (pick) =>
              pick.entryId === input.entryId &&
              (!options.filter?.seasonId?.eq ||
                pick.seasonId === options.filter.seasonId.eq),
          );
          const page = matchingPicks.slice(offset, offset + pickPageSize);
          const nextOffset = offset + page.length;

          return {
            data: page.map((pick) => ({ ...pick })),
            nextToken:
              nextOffset < matchingPicks.length
                ? `offset-${nextOffset}`
                : null,
          };
        },
        create: async (payload) => {
          calls.create.push(payload);
          if (createResult) {
            const overriddenResult =
              typeof createResult === "function"
                ? createResult(payload, calls)
                : createResult;
            if (overriddenResult) {
              return overriddenResult;
            }
          }

          const created = {
            ...payload,
            createdAt: "2026-07-22T19:28:14.158Z",
            updatedAt: "2026-07-22T19:28:14.158Z",
          };
          picks.push(created);
          return { data: created };
        },
        delete: async (payload) => {
          calls.delete.push(payload);
          if (deleteResult) {
            const overriddenResult =
              typeof deleteResult === "function"
                ? deleteResult(payload, calls)
                : deleteResult;
            if (overriddenResult) {
              return overriddenResult;
            }
          }

          const deleted = picks.find((pick) => pick.id === payload.id) || null;
          picks = picks.filter((pick) => pick.id !== payload.id);
          return { data: deleted };
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
    listRawSeasonGames: async () => seasonGames,
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

test("unchecking a winner deletes only that Pick and remains clear after reload", async () => {
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
      {
        id: "pick-entry-id-game-2",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-2",
        owner: "user-sub",
        selectedTeam: "CCC",
      },
    ],
    seasonGames: [game, secondGame],
  });

  const result = await save({
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: { "game-2": "CCC" },
    tieBreakerValue: null,
  });
  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1", "game-2"],
  });

  assert.deepEqual(calls.delete, [{ id: "pick-entry-id-game-1" }]);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
  assert.deepEqual(calls.entryUpdate, []);
  assert.deepEqual(result.selectionsByGameId, { "game-2": "CCC" });
  assert.deepEqual(reloaded.selectionsByGameId, { "game-2": "CCC" });
});

test("a failed Pick clear remains persisted and reports delete diagnostics", async () => {
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
    deleteResult: {
      data: null,
      errors: [{ message: "Backend Pick clear failed." }],
    },
  });

  await assert.rejects(
    save({ selectionsByGameId: {}, tieBreakerValue: null }),
    (error) => {
      assert.equal(error.name, "PickPersistenceError");
      assert.equal(error.message, "Backend Pick clear failed.");
      assert.equal(error.operation, "delete");
      assert.equal(error.entryId, "entry-id");
      assert.equal(error.gameId, "game-1");
      assert.equal(error.pickId, "pick-entry-id-game-1");
      return true;
    },
  );

  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1"],
  });
  assert.deepEqual(calls.delete, [{ id: "pick-entry-id-game-1" }]);
  assert.deepEqual(reloaded.selectionsByGameId, { "game-1": "AAA" });
});

test("a partial bulk clear keeps successful deletes and preserves the failed Pick", async () => {
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
      {
        id: "pick-entry-id-game-2",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-2",
        owner: "user-sub",
        selectedTeam: "CCC",
      },
    ],
    deleteResult: (_payload, currentCalls) =>
      currentCalls.delete.length === 2
        ? {
            data: null,
            errors: [{ message: "Second clear failed." }],
          }
        : null,
    seasonGames: [game, secondGame],
  });

  await assert.rejects(
    save({
      currentGameIds: ["game-1", "game-2"],
      selectionsByGameId: {},
    }),
    (error) => {
      assert.match(error.message, /Second clear failed/);
      assert.deepEqual(error.completedPickChanges, [
        {
          gameId: "game-1",
          operation: "delete",
          selectedTeam: null,
        },
      ]);
      assert.deepEqual(error.partialResult.selectionsByGameId, {
        "game-2": "CCC",
      });
      return true;
    },
  );

  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1", "game-2"],
  });
  assert.deepEqual(calls.delete, [
    { id: "pick-entry-id-game-1" },
    { id: "pick-entry-id-game-2" },
  ]);
  assert.deepEqual(reloaded.selectionsByGameId, { "game-2": "CCC" });
});

test("a partial multi-pick save reports and reloads its successful mutations", async () => {
  const { calls } = createHarness({
    createResult: (_payload, currentCalls) =>
      currentCalls.create.length === 2
        ? {
            data: null,
            errors: [{ message: "Second random pick failed." }],
          }
        : null,
    seasonGames: [game, secondGame],
  });

  await assert.rejects(
    save({
      currentGameIds: ["game-1", "game-2"],
      selectionsByGameId: {
        "game-1": "BBB",
        "game-2": "DDD",
      },
    }),
    (error) => {
      assert.match(error.message, /Second random pick failed/);
      assert.deepEqual(error.completedPickChanges, [
        {
          gameId: "game-1",
          operation: "create",
          selectedTeam: "BBB",
        },
      ]);
      assert.deepEqual(error.partialResult.selectionsByGameId, {
        "game-1": "BBB",
      });
      return true;
    },
  );

  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1", "game-2"],
  });
  assert.equal(calls.create.length, 2);
  assert.deepEqual(reloaded.selectionsByGameId, { "game-1": "BBB" });
});

test("multiple new selections use canonical payloads and survive reload", async () => {
  const { calls } = createHarness({
    seasonGames: [game, secondGame],
  });

  await save({
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: {
      "game-1": "AAA",
      "game-2": "DDD",
    },
  });
  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1", "game-2"],
  });

  assert.equal(calls.create.length, 2);
  assert.deepEqual(
    calls.create.map(({ entryId, owner, seasonId }) => ({
      entryId,
      owner,
      seasonId,
    })),
    [
      {
        entryId: "entry-id",
        owner: "user-sub",
        seasonId: "test26",
      },
      {
        entryId: "entry-id",
        owner: "user-sub",
        seasonId: "test26",
      },
    ],
  );
  assert.deepEqual(reloaded.selectionsByGameId, {
    "game-1": "AAA",
    "game-2": "DDD",
  });
});

test("changing and restoring one pick preserves unrelated persisted picks", async () => {
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
      {
        id: "pick-entry-id-game-2",
        seasonId: "test26",
        entryId: "entry-id",
        gameId: "game-2",
        owner: "user-sub",
        selectedTeam: "CCC",
      },
    ],
    seasonGames: [game, secondGame],
  });
  const input = {
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: {
      "game-1": "BBB",
      "game-2": "CCC",
    },
  };

  const changed = await save(input);
  const changedReload = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: input.currentGameIds,
  });
  const restored = await save({
    ...input,
    selectionsByGameId: {
      ...input.selectionsByGameId,
      "game-1": "AAA",
    },
  });
  const restoredReload = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: input.currentGameIds,
  });

  assert.deepEqual(changed.selectionsByGameId, {
    "game-1": "BBB",
    "game-2": "CCC",
  });
  assert.deepEqual(changedReload.selectionsByGameId, changed.selectionsByGameId);
  assert.deepEqual(restored.selectionsByGameId, {
    "game-1": "AAA",
    "game-2": "CCC",
  });
  assert.deepEqual(
    restoredReload.selectionsByGameId,
    restored.selectionsByGameId,
  );
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "BBB" },
    { id: "pick-entry-id-game-1", selectedTeam: "AAA" },
  ]);
  assert.deepEqual(calls.entryUpdate, []);
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
    (error) => {
      assert.equal(error.name, "PickPersistenceError");
      assert.equal(error.message, "Backend Pick save failed.");
      assert.equal(typeof error.correlationId, "string");
      assert.equal(error.correlationId.length > 0, true);
      assert.equal(error.operation, "create");
      assert.equal(error.entryId, "entry-id");
      assert.equal(error.gameId, "game-1");
      assert.equal(error.pickId, "pick-entry-id-game-1");
      assert.equal(error.selectedTeam, "AAA");
      assert.deepEqual(error.graphQLErrors, [
        {
          message: "Backend Pick save failed.",
          path: null,
          errorType: null,
          errorInfo: null,
        },
      ]);
      assert.equal(error.returnedData, null);
      return true;
    },
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

test("loading an entry exhausts a 31 plus 17 page split", async () => {
  const initialPicks = Array.from({ length: 48 }, (_, index) => ({
    id: `pick-entry-id-game-${index + 1}`,
    seasonId: "test26",
    entryId: "entry-id",
    gameId: `game-${index + 1}`,
    owner: "user-sub",
    selectedTeam: index % 2 === 0 ? "AAA" : "BBB",
  }));
  const { calls } = createHarness({
    initialPicks,
    pickPageSize: 31,
  });

  const result = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: initialPicks.map((pick) => pick.gameId),
  });

  assert.equal(result.picks.length, 48);
  assert.equal(Object.keys(result.picksByGameId).length, 48);
  assert.equal(Object.keys(result.selectionsByGameId).length, 48);
  assert.deepEqual(
    calls.pickByEntryAndGame.map(({ input, options }) => ({
      input,
      nextToken: options.nextToken,
      seasonId: options.filter?.seasonId?.eq,
    })),
    [
      {
        input: { entryId: "entry-id" },
        nextToken: undefined,
        seasonId: "test26",
      },
      {
        input: { entryId: "entry-id" },
        nextToken: "offset-31",
        seasonId: "test26",
      },
    ],
  );
});

test("an existing Pick on a later page is updated instead of created", async () => {
  const firstPagePicks = Array.from({ length: 31 }, (_, index) => ({
    id: `pick-entry-id-filler-${index + 1}`,
    seasonId: "test26",
    entryId: "entry-id",
    gameId: `filler-${index + 1}`,
    owner: "user-sub",
    selectedTeam: "AAA",
  }));
  const existingPick = {
    id: "pick-entry-id-game-1",
    seasonId: "test26",
    entryId: "entry-id",
    gameId: "game-1",
    owner: "user-sub",
    selectedTeam: "AAA",
  };
  const laterPagePicks = Array.from({ length: 16 }, (_, index) => ({
    id: `pick-entry-id-later-${index + 1}`,
    seasonId: "test26",
    entryId: "entry-id",
    gameId: `later-${index + 1}`,
    owner: "user-sub",
    selectedTeam: "BBB",
  }));
  const { calls } = createHarness({
    initialPicks: [...firstPagePicks, existingPick, ...laterPagePicks],
    pickPageSize: 31,
  });

  const result = await save({
    selectionsByGameId: { "game-1": "BBB" },
    tieBreakerValue: null,
  });

  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "BBB" },
  ]);
  assert.equal(result.selectionsByGameId["game-1"], "BBB");
  assert.equal(calls.pickByEntryAndGame.length, 4);
});
