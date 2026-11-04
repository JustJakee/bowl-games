import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  reconcilePickDraft,
  createPerEntryAutosaveCoordinator,
  buildFailedClearDraft,
  buildClearFailureState,
  buildSyncedDraft,
} from "../components/picks/picksAutosaveState";
import { buildClearAllDraft } from "../components/picks/pickActions";
import { buildPickSelectionView } from "../components/picks/pickSelectionView";
import {
  __setPicksRepositoryDependenciesForTests,
  loadEntryPicks,
  runSecurePickMutation,
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
  entryUpdateResult,
  hiddenIndexGameIds = [],
  staleIndexPicks = null,
  pickPageSize = 100,
  seasonGames = [game],
  updateResult,
} = {}) => {
  let picks = initialPicks.map((pick) => ({ ...pick }));
  const calls = {
    create: [],
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
          const matchingPicks = (staleIndexPicks || picks).filter(
            (pick) =>
              pick.entryId === input.entryId &&
              !hiddenIndexGameIds.includes(pick.gameId) &&
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
        update: async (payload) => {
          calls.update.push(payload);
          if (updateResult) {
            const overriddenResult =
              typeof updateResult === "function"
                ? updateResult(payload, calls)
                : updateResult;
            if (overriddenResult) {
              return overriddenResult;
            }
          }

          picks = picks.map((pick) =>
            pick.id === payload.id ? { ...pick, ...payload } : pick,
          );
          return { data: picks.find((pick) => pick.id === payload.id) };
        },
      },
    },
  };

  dataClient.graphql = async ({ query, variables, authMode }) => {
    assert.match(query, /query EntryPicks/);
    assert.equal(authMode, "userPool");
    const { entryId, ...options } = variables;
    const result = await dataClient.models.Pick.pickByEntryAndGame(
      { entryId },
      { ...options, authMode },
    );
    return {
      data: {
        pickByEntryAndGame: {
          items: result.data,
          nextToken: result.nextToken,
        },
      },
      errors: result.errors,
    };
  };

  __setPicksRepositoryDependenciesForTests({
    dataClient,
    savePick: ({ entryId, gameId, selectedTeam }) => {
      const existing = picks.find(
        (pick) => pick.entryId === entryId && pick.gameId === gameId,
      );
      return existing
        ? dataClient.models.Pick.update({ id: existing.id, selectedTeam })
        : dataClient.models.Pick.create({
            id: `pick-${entryId}-${gameId}`,
            seasonId: currentEntry.seasonId,
            entryId,
            gameId,
            owner: currentEntry.owner,
            selectedTeam,
          });
    },
    getEntryById: async () => currentEntry,
    listRawSeasonGames: async () => seasonGames,
    updateEntry: async (input) => {
      calls.entryUpdate.push(input);
      if (entryUpdateResult) return entryUpdateResult(input, calls);
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

  return { calls, dataClient };
};

test("production pick writes use only the authenticated guarded mutation", async () => {
  const calls = [];
  const client = {
    models: {
      Pick: {
        create: () => {
          throw new Error("raw create called");
        },
        update: () => {
          throw new Error("raw update called");
        },
      },
    },
    mutations: {
      saveSeasonPick: async (...args) => {
        calls.push(args);
        return { data: { id: "p1" } };
      },
    },
  };
  await runSecurePickMutation(client, {
    entryId: "e1",
    gameId: "g1",
    selectedTeam: "AAA",
  });
  assert.deepEqual(calls, [
    [
      { entryId: "e1", gameId: "g1", selectedTeam: "AAA" },
      { authMode: "userPool" },
    ],
  ]);
});

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

const savedPick = (gameId = "game-1", selectedTeam = "AAA") => ({
  id: `pick-entry-id-${gameId}`,
  entryId: entry.id,
  seasonId: entry.seasonId,
  gameId,
  owner: entry.owner,
  selectedTeam,
});

test("raw pick reads use owner auth, season filtering and every page including empty pages", async () => {
  const calls = [];
  __setPicksRepositoryDependenciesForTests({
    dataClient: {
      graphql: async (request) => {
        calls.push(request);
        return {
          data: {
            pickByEntryAndGame:
              calls.length === 1
                ? { items: [], nextToken: "page-two" }
                : { items: [savedPick()], nextToken: null },
          },
        };
      },
    },
  });
  const result = await loadEntryPicks({
    entryId: entry.id,
    seasonId: entry.seasonId,
  });
  assert.deepEqual(result.selectionsByGameId, { "game-1": "AAA" });
  assert.deepEqual(
    calls.map(({ authMode, variables }) => ({ authMode, variables })),
    [
      {
        authMode: "userPool",
        variables: {
          entryId: entry.id,
          filter: { seasonId: { eq: entry.seasonId } },
          nextToken: undefined,
          limit: 100,
        },
      },
      {
        authMode: "userPool",
        variables: {
          entryId: entry.id,
          filter: { seasonId: { eq: entry.seasonId } },
          nextToken: "page-two",
          limit: 100,
        },
      },
    ],
  );
});

test("returned and thrown partial GraphQL errors fail the entire read, even on later pages", async () => {
  for (const thrown of [false, true]) {
    let calls = 0;
    __setPicksRepositoryDependenciesForTests({
      dataClient: {
        graphql: async () => {
          if (++calls === 1)
            return {
              data: {
                pickByEntryAndGame: {
                  items: [savedPick()],
                  nextToken: "next",
                },
              },
            };
          const result = {
            data: { pickByEntryAndGame: { items: [], nextToken: null } },
            errors: [{ message: "Unauthorized", errorType: "Unauthorized" }],
          };
          if (thrown) throw result;
          return result;
        },
      },
    });
    await assert.rejects(
      loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }),
      (error) =>
        error.message.includes("Unauthorized") &&
        error.graphQLErrors[0].errorType === "Unauthorized",
    );
    assert.equal(calls, 2);
  }
});

test("malformed pick connections and repeated tokens cannot be accepted as an empty account", async () => {
  for (const connection of [
    null,
    {},
    { items: null },
    { items: {} },
    { items: [null] },
    { items: [{}] },
    { items: [], nextToken: 7 },
  ]) {
    __setPicksRepositoryDependenciesForTests({
      dataClient: {
        graphql: async () => ({ data: { pickByEntryAndGame: connection } }),
      },
    });
    await assert.rejects(
      loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }),
      /invalid backend response/,
    );
  }
  __setPicksRepositoryDependenciesForTests({
    dataClient: {
      graphql: async () => ({
        data: { pickByEntryAndGame: { items: [], nextToken: "same" } },
      }),
    },
  });
  await assert.rejects(
    loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }),
    /repeated pagination token/,
  );
});

test("duplicate picks are rejected instead of allowing list order to select a winner", async () => {
  createHarness({
    initialPicks: [
      savedPick(),
      { ...savedPick(), id: "legacy-pick", selectedTeam: "BBB" },
    ],
  });
  await assert.rejects(
    loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }),
    /Multiple saved picks/,
  );
});

test("a wrong-entry or wrong-season response fails closed instead of replacing the account with an empty draft", async () => {
  for (const row of [
    { ...savedPick(), entryId: "foreign" },
    { ...savedPick(), seasonId: "another-season" },
  ]) {
    __setPicksRepositoryDependenciesForTests({
      dataClient: {
        graphql: async () => ({
          data: { pickByEntryAndGame: { items: [row] } },
        }),
      },
    });
    await assert.rejects(
      loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }),
      /does not match the requested/,
    );
  }
});

test("a failed pre-save read performs no mutations", async () => {
  let writes = 0;
  __setPicksRepositoryDependenciesForTests({
    dataClient: {
      graphql: async () => ({
        data: { pickByEntryAndGame: null },
        errors: [{ message: "Read denied" }],
      }),
    },
    getEntryById: async () => entry,
    listRawSeasonGames: async () => [game],
    savePick: async () => {
      writes += 1;
    },
  });
  await assert.rejects(
    save({ selectionsByGameId: { "game-1": "AAA" } }),
    /Read denied/,
  );
  assert.equal(writes, 0);
});

test("mutation partial errors never confirm a selection even when the returned record matches", async () => {
  createHarness({ createResult: { data: savedPick(), errors: [{}] } });
  await assert.rejects(
    save({ selectionsByGameId: { "game-1": "AAA" } }),
    (error) => {
      assert.equal(error.name, "PickPersistenceError");
      assert.equal(error.graphQLErrors.length, 1);
      return true;
    },
  );
});

test("a fresh repository client restores a confirmed selection without a device draft", async () => {
  const { dataClient } = createHarness();
  await save({
    selectionsByGameId: { "game-1": "BBB" },
    forceGameIds: ["game-1"],
  });
  __setPicksRepositoryDependenciesForTests(null);
  __setPicksRepositoryDependenciesForTests({
    dataClient: { graphql: (request) => dataClient.graphql(request) },
  });
  const result = await loadEntryPicks({
    entryId: entry.id,
    seasonId: entry.seasonId,
  });
  assert.deepEqual(result.selectionsByGameId, { "game-1": "BBB" });
});

test("reconciled device edits preserve unrelated account picks through saving and reload", async () => {
  createHarness({
    initialPicks: [savedPick("game-2", "CCC")],
    seasonGames: [game, secondGame],
  });
  const draft = reconcilePickDraft({
    draft: {
      dirty: true,
      selectionsByGameId: { "game-1": "BBB" },
      changedGameIds: ["game-1"],
    },
    backendDraft: { selectionsByGameId: { "game-2": "CCC" } },
    cacheReady: true,
    hydrated: true,
  });
  const result = await save({
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: draft.selectionsByGameId,
    forceGameIds: draft.changedGameIds,
  });
  const reloaded = await loadEntryPicks({
    entryId: entry.id,
    seasonId: entry.seasonId,
  });
  assert.deepEqual(result.selectionsByGameId, {
    "game-1": "BBB",
    "game-2": "CCC",
  });
  assert.deepEqual(reloaded.selectionsByGameId, result.selectionsByGameId);
});

test("an individual save cannot clear an account pick that appeared after hydration", async () => {
  const { calls } = createHarness({
    initialPicks: [savedPick("game-2", "CCC")],
    seasonGames: [game, secondGame],
  });
  const result = await save({
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: { "game-1": "BBB" },
    forceGameIds: ["game-1"],
  });
  assert.deepEqual(calls.update, []);
  assert.deepEqual(result.selectionsByGameId, {
    "game-1": "BBB",
    "game-2": "CCC",
  });
});

test("overlapping select, replace and deselect requests drain to the latest persisted intent", async () => {
  createHarness();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const applied = [];
  const coordinator = createPerEntryAutosaveCoordinator({
    save: async ({ revision, input }) => {
      if (revision === 1) await gate;
      return save(input);
    },
    onSuccess: ({ revision }) => applied.push(revision),
  });
  const first = coordinator.enqueue({
    entryId: entry.id,
    revision: 1,
    input: {
      selectionsByGameId: { "game-1": "AAA" },
      forceGameIds: ["game-1"],
    },
  });
  const replacement = coordinator.enqueue({
    entryId: entry.id,
    revision: 2,
    input: {
      selectionsByGameId: { "game-1": "BBB" },
      forceGameIds: ["game-1"],
    },
  });
  const clear = coordinator.enqueue({
    entryId: entry.id,
    revision: 3,
    input: { selectionsByGameId: {}, forceGameIds: ["game-1"] },
  });
  release();
  assert.equal((await first).status, "superseded");
  assert.equal((await replacement).status, "superseded");
  assert.equal((await clear).status, "saved");
  assert.deepEqual(applied, [3]);
  const reloaded = await loadEntryPicks({
    entryId: entry.id,
    seasonId: entry.seasonId,
  });
  assert.deepEqual(reloaded.selectionsByGameId, {});
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

test("a rapid A to B to A sequence writes the latest edit despite a stale A index result", async () => {
  const savedA = {
    id: "pick-entry-id-game-1",
    seasonId: "test26",
    entryId: "entry-id",
    gameId: "game-1",
    owner: "user-sub",
    selectedTeam: "AAA",
  };
  const { calls } = createHarness({
    initialPicks: [{ ...savedA, selectedTeam: "BBB" }],
    staleIndexPicks: [savedA],
  });
  const result = await save({
    selectionsByGameId: { "game-1": "AAA" },
    forceGameIds: ["game-1"],
  });
  assert.deepEqual(calls.update, [{ id: savedA.id, selectedTeam: "AAA" }]);
  assert.equal(result.selectionsByGameId["game-1"], "AAA");
});

test("unchecking a winner clears only that Pick and remains incomplete after reload", async () => {
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

  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "" },
  ]);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.entryUpdate, []);
  assert.deepEqual(result.selectionsByGameId, { "game-2": "CCC" });
  assert.deepEqual(reloaded.selectionsByGameId, { "game-2": "CCC" });
});

test("a failed Pick clear remains selected and reports clear diagnostics", async () => {
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
    updateResult: {
      data: null,
      errors: [{ message: "Backend Pick clear failed." }],
    },
  });

  await assert.rejects(
    save({ selectionsByGameId: {}, tieBreakerValue: null }),
    (error) => {
      assert.equal(error.name, "PickPersistenceError");
      assert.equal(error.message, "Backend Pick clear failed.");
      assert.equal(error.operation, "clear");
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
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "" },
  ]);
  assert.deepEqual(reloaded.selectionsByGameId, { "game-1": "AAA" });
});

test("a mutation with no confirmed record cannot report a successful clear", async () => {
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
    updateResult: { data: null },
  });
  await assert.rejects(
    save({ selectionsByGameId: {} }),
    /backend did not confirm/,
  );
});

test("a stale index read cannot restore a pick after confirmed clear", async () => {
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
  const result = await save({ selectionsByGameId: {} });
  assert.deepEqual(result.selectionsByGameId, {});
  assert.equal(calls.pickByEntryAndGame.length, 1);
});

test("bulk clear sends a known selected game even when the index omits it", async () => {
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
    hiddenIndexGameIds: ["game-1"],
  });
  const result = await save({
    selectionsByGameId: {},
    knownSelectionsByGameId: { "game-1": "AAA" },
  });
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "" },
  ]);
  assert.deepEqual(result.selectionsByGameId, {});
});

test("a cleared Pick is not cleared repeatedly and is reused when reselected", async () => {
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

  await save({ selectionsByGameId: {} });
  await save({ selectionsByGameId: {} });
  await save({ selectionsByGameId: { "game-1": "BBB" } });

  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "" },
    { id: "pick-entry-id-game-1", selectedTeam: "BBB" },
  ]);
  const reloaded = await loadEntryPicks({
    entryId: "entry-id",
    seasonId: "test26",
    currentGameIds: ["game-1"],
  });
  assert.deepEqual(reloaded.selectionsByGameId, { "game-1": "BBB" });
});

test("bulk clear progress advances only after each backend acknowledgment", async () => {
  const progress = [];
  createHarness({
    initialPicks: [
      savedPick("game-1", "AAA"),
      savedPick("game-2", "CCC"),
    ],
    seasonGames: [game, secondGame],
  });

  await save({
    currentGameIds: ["game-1", "game-2"],
    selectionsByGameId: {},
    forceGameIds: ["game-1", "game-2"],
    onPickProgress: (event) => progress.push(event),
  });

  assert.deepEqual(
    progress.map(({ completed, total, acknowledgedChange }) => [
      completed,
      total,
      acknowledgedChange?.gameId || null,
    ]),
    [
      [0, 2, null],
      [1, 2, "game-1"],
      [2, 2, "game-2"],
    ],
  );
});

test("a partial bulk clear keeps successful clears and preserves the failed Pick", async () => {
  const progress = [];
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
    updateResult: (_payload, currentCalls) =>
      currentCalls.update.length === 2
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
      onPickProgress: (event) => progress.push(event),
    }),
    (error) => {
      assert.match(error.message, /Second clear failed/);
      assert.deepEqual(error.completedPickChanges, [
        {
          gameId: "game-1",
          operation: "clear",
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
  assert.deepEqual(calls.update, [
    { id: "pick-entry-id-game-1", selectedTeam: "" },
    { id: "pick-entry-id-game-2", selectedTeam: "" },
  ]);
  assert.deepEqual(reloaded.selectionsByGameId, { "game-2": "CCC" });
  assert.deepEqual(
    progress.map(({ completed, total, acknowledgedChange }) => [
      completed,
      total,
      acknowledgedChange?.gameId || null,
    ]),
    [
      [0, 2, null],
      [1, 2, "game-1"],
    ],
  );
});

const clearDraft = (draft, revision = 1) =>
  buildClearAllDraft({
    draft,
    editableGameIds: new Set([game.id, secondGame.id]),
    revision,
  });

const saveClear = (draft) =>
  save({
    currentGameIds: [game.id, secondGame.id],
    selectionsByGameId: draft.selectionsByGameId,
    forceGameIds: draft.changedGameIds,
    tieBreakerValue: draft.tieBreakerValue,
    tieBreakerGameId: secondGame.id,
    tieBreakerRequired: true,
  });

test("Clear All without pending saves clears hidden account picks and survives reload and a fresh authenticated client", async () => {
  const accountEntry = { ...entry, tieBreakerValue: 42 };
  const { calls, dataClient } = createHarness({
    currentEntry: accountEntry,
    initialPicks: [savedPick(), savedPick(secondGame.id, "CCC")],
    hiddenIndexGameIds: [secondGame.id],
    seasonGames: [game, secondGame],
  });
  // Only one of the two persisted choices is visible on this device.
  const draft = clearDraft({
    selectionsByGameId: { [game.id]: "AAA" },
    tieBreakerValue: "42",
  });
  const result = await saveClear(draft);
  assert.deepEqual(result.selectionsByGameId, {});
  assert.deepEqual(
    calls.update.map(({ selectedTeam }) => selectedTeam),
    ["", ""],
  );
  assert.equal(result.entry.tieBreakerValue, 42);
  assert.equal(result.status, "DRAFT");
  assert.deepEqual(calls.entryUpdate, []);
  assert.deepEqual(
    (await loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }))
      .selectionsByGameId,
    {},
  );

  __setPicksRepositoryDependenciesForTests(null);
  __setPicksRepositoryDependenciesForTests({
    dataClient: { graphql: (request) => dataClient.graphql(request) },
  });
  const fresh = await loadEntryPicks({
    entryId: entry.id,
    seasonId: entry.seasonId,
  });
  assert.deepEqual(fresh.selectionsByGameId, {});
  const view = buildPickSelectionView({
    currentEntry: result.entry,
    hydratedEntryId: entry.id,
    activeDraft: buildSyncedDraft(result, 1),
    games: [{ id: game.id }, { id: secondGame.id, isTieBreakerGame: true }],
    tieBreakerRequired: true,
  });
  assert.equal(view.selectedCount, 0);
  assert.equal(view.incompleteCount, 2);
  assert.equal(view.hasTieBreaker, true);
  assert.equal(view.entryStatus, "DRAFT");
});

test("Clear All waits for the in-flight save, supersedes older pending saves and rejects a late debounce", async () => {
  const { calls } = createHarness({ seasonGames: [game, secondGame] });
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const started = [];
  const applied = [];
  const coordinator = createPerEntryAutosaveCoordinator({
    save: async ({ revision, draft }) => {
      started.push(revision);
      if (revision === 1) await gate;
      return saveClear(draft);
    },
    onSuccess: ({ revision }) => applied.push(revision),
  });
  const local = {
    selectionsByGameId: { [game.id]: "AAA", [secondGame.id]: "CCC" },
    changedGameIds: [game.id, secondGame.id],
    tieBreakerValue: "",
  };
  const first = coordinator.enqueue({
    entryId: entry.id,
    revision: 1,
    draft: local,
  });
  const pending = coordinator.enqueue({
    entryId: entry.id,
    revision: 2,
    draft: { ...local, selectionsByGameId: { [game.id]: "BBB" } },
  });
  const revision = coordinator.nextRevision(entry.id, 2);
  const cleared = coordinator.enqueue({
    entryId: entry.id,
    revision,
    draft: clearDraft(local, revision),
  });
  assert.equal((await pending).status, "superseded");
  assert.deepEqual(started, [1]);
  release();
  assert.equal((await first).status, "superseded");
  assert.equal((await cleared).status, "saved");
  assert.deepEqual(started, [1, 3]);
  assert.deepEqual(applied, [3]);
  const beforeLate = calls.update.length;
  const late = await coordinator.enqueue({
    entryId: entry.id,
    revision: 2,
    draft: local,
  });
  assert.equal(late.status, "superseded");
  assert.equal(calls.update.length, beforeLate);
  assert.deepEqual(
    (await loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }))
      .selectionsByGameId,
    {},
  );
});

test("failed Clear All retains device intent and never marks partial completion as saved", async () => {
  for (const failAt of [1, 2]) {
    let failureEnabled = true;
    const { calls } = createHarness({
      initialPicks: [savedPick(), savedPick(secondGame.id, "CCC")],
      seasonGames: [game, secondGame],
      updateResult: (_payload, recorded) =>
        failureEnabled && recorded.update.length === failAt
          ? {
              data: null,
              errors: [
                {
                  message: "Conditional clear failed",
                  errorType: "DynamoDB:ConditionalCheckFailedException",
                },
              ],
            }
          : null,
    });
    const draft = clearDraft({
      selectionsByGameId: { [game.id]: "AAA", [secondGame.id]: "CCC" },
      tieBreakerValue: "",
    });
    let failedDraft;
    await assert.rejects(saveClear(draft), (error) => {
      failedDraft = buildFailedClearDraft(draft, error);
      assert.equal(error.completedPickChanges.length, failAt - 1);
      assert.equal(failedDraft.clearError.partial, failAt === 2);
      assert.deepEqual(failedDraft.selectionsByGameId, {});
      assert.equal(failedDraft.dirty, true);
      const state = buildClearFailureState(failedDraft.clearError);
      assert.notEqual(state.state, "saved");
      assert.match(state.detail, /Conditional clear failed/);
      return true;
    });
    assert.equal(calls.update.length, failAt);
    // Reload the actual device payload against the partly cleared account.
    const device = JSON.parse(JSON.stringify(failedDraft));
    const backend = await loadEntryPicks({
      entryId: entry.id,
      seasonId: entry.seasonId,
    });
    assert.deepEqual(
      backend.selectionsByGameId,
      failAt === 1
        ? { [game.id]: "AAA", [secondGame.id]: "CCC" }
        : { [secondGame.id]: "CCC" },
    );
    const restored = reconcilePickDraft({
      draft: device,
      backendDraft: backend,
      cacheReady: true,
      hydrated: true,
    });
    assert.deepEqual(restored.selectionsByGameId, {});
    assert.equal(restored.dirty, true);
    assert.match(restored.clearError.message, /Conditional clear failed/);
    // Retry the original clear command, rather than resaving a partial snapshot.
    failureEnabled = false;
    const retried = await saveClear({ ...restored, clearError: null });
    assert.deepEqual(retried.selectionsByGameId, {});
    assert.deepEqual(
      (await loadEntryPicks({ entryId: entry.id, seasonId: entry.seasonId }))
        .selectionsByGameId,
      {},
    );
  }
});

test("a device clear recorded before dispatch survives a reload against an older account snapshot", () => {
  const device = JSON.parse(
    JSON.stringify(
      clearDraft({
        selectionsByGameId: { [game.id]: "AAA" },
        tieBreakerValue: "42",
      }),
    ),
  );
  const restored = reconcilePickDraft({
    draft: device,
    backendDraft: {
      selectionsByGameId: { [game.id]: "AAA", [secondGame.id]: "CCC" },
    },
    cacheReady: true,
    hydrated: true,
  });
  assert.deepEqual(restored.selectionsByGameId, {});
  assert.equal(restored.tieBreakerValue, "42");
  assert.equal(restored.clearAll, true);
  assert.deepEqual(restored.changedGameIds, [game.id, secondGame.id]);
});

test("Clear All in a locked season dispatches no pick or entry writes", async () => {
  const { calls } = createHarness({
    initialPicks: [savedPick()],
    seasonGames: [game, secondGame],
  });
  const draft = clearDraft({ selectionsByGameId: { [game.id]: "AAA" } });
  await assert.rejects(
    save({
      selectionsByGameId: draft.selectionsByGameId,
      forceGameIds: draft.changedGameIds,
      currentGameIds: [game.id, secondGame.id],
      now: Date.parse(futurePickDeadline),
    }),
    /locked/i,
  );
  assert.deepEqual(calls.update, []);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.entryUpdate, []);
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

test("an Entry update failure reconciles picks already saved in the same request", async () => {
  const { calls } = createHarness({
    entryUpdateResult: () => {
      throw new Error("Entry update failed.");
    },
  });
  await assert.rejects(
    save({
      selectionsByGameId: { "game-1": "AAA" },
      contactEmail: "updated@example.com",
    }),
    (error) => {
      assert.match(error.message, /Entry update failed/);
      assert.deepEqual(error.completedPickChanges, [
        { gameId: "game-1", operation: "create", selectedTeam: "AAA" },
      ]);
      assert.deepEqual(error.partialResult.selectionsByGameId, {
        "game-1": "AAA",
      });
      return true;
    },
  );
  assert.equal(calls.entryUpdate.length, 1);
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
  assert.deepEqual(
    changedReload.selectionsByGameId,
    changed.selectionsByGameId,
  );
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

test("a null pick page fails instead of erasing saved selections", async () => {
  __setPicksRepositoryDependenciesForTests({
    dataClient: {
      graphql: async () => ({ data: { pickByEntryAndGame: null } }),
    },
  });
  await assert.rejects(
    loadEntryPicks({ entryId: "entry-id", seasonId: "test26" }),
    /invalid backend response/,
  );
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
  assert.equal(calls.pickByEntryAndGame.length, 2);
});
