import assert from "node:assert/strict";
import test, { beforeEach, afterEach, after, mock } from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Execute the production handler and rules. Replace only initialization/network
// boundaries; all validation, pagination, writes and visibility logic stays real.
const root = fileURLToPath(new URL("../../../", import.meta.url));
await mkdir(path.join(root, "tmp"), { recursive: true });
const directory = await mkdtemp(
  path.join(root, "tmp", "secure-picks-contract-"),
);
after(async () => {
  delete globalThis.__securePicksContractClient;
  await rm(directory, { recursive: true, force: true });
});
const client = { models: {} };
globalThis.__securePicksContractClient = client;
const handlerPath = path.join(root, "amplify/data/secure-picks/handler.js");
const source = await readFile(handlerPath, "utf8");
const instrumented = source
  .replace(
    'import { Amplify } from "aws-amplify";',
    "const Amplify = { configure() {} };",
  )
  .replace(
    'import { generateClient } from "aws-amplify/data";',
    "const generateClient = () => globalThis.__securePicksContractClient;",
  )
  .replace(
    'import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";',
    "const getAmplifyDataClientConfig = async () => ({ resourceConfig: {}, libraryOptions: {} });",
  )
  .replace(
    'import { env } from "$amplify/env/secure-picks";',
    "const env = {};",
  )
  .replace(
    'from "./rules.mjs";',
    `from "${pathToFileURL(path.join(root, "amplify/data/secure-picks/rules.mjs")).href}";`,
  );
const runnable = instrumented.replace(
  'from "../../../shared/entryPickQuery.mjs";',
  `from "${pathToFileURL(path.join(root, "shared/entryPickQuery.mjs")).href}";`,
);
assert.notEqual(instrumented, source);
await writeFile(path.join(directory, "handler.mjs"), runnable);
const { handler } = await import(
  pathToFileURL(path.join(directory, "handler.mjs")).href
);

const PLAYER = {
  sub: "player-one",
  groups: ["player"],
  claims: { "cognito:groups": ["player"] },
};
const start = Date.parse("2030-01-01T00:00:00Z");
const iso = (offset) => new Date(start + offset).toISOString();
const argsByField = {
  createSeasonEntry: {
    seasonId: "season",
    entryName: "My picks",
    contactEmail: "player@example.com",
    userProfileId: "profile",
  },
  updateSeasonEntry: {
    entryId: "entry-one",
    entryName: "New name",
    tieBreakerValue: 42,
  },
  saveSeasonPick: {
    entryId: "entry-one",
    gameId: "game-one",
    selectedTeam: "AAA",
  },
  visibleSeasonPicks: { seasonId: "season" },
};

// Preflight supplies a template per operation, resolved from the synthesized
// AppSync pipeline. Substitute known JSON ctx expressions, never invent action.
const event = (
  fieldName,
  args = argsByField[fieldName] || {},
  identity = PLAYER,
) => {
  const ctx = {
    typeName: fieldName === "visibleSeasonPicks" ? "Query" : "Mutation",
    fieldName,
    arguments: args,
    identity,
    source: null,
    request: { headers: {} },
    prev: null,
  };
  const templates = JSON.parse(
    process.env.SECURE_PICKS_REQUEST_TEMPLATES || "{}",
  );
  if (!templates[fieldName]) {
    if (
      process.env.SECURE_PICKS_REQUEST_TEMPLATES &&
      Object.hasOwn(argsByField, fieldName)
    )
      assert.fail(`Missing generated payload for ${fieldName}`);
    return ctx;
  }
  const rendered = templates[fieldName]
    .replace(/^\s*##.*$/gm, "")
    .replace(
      /\$util\.toJson\(\$ctx\.stash\.get\("(typeName|fieldName)"\)\)/g,
      (_, key) => JSON.stringify(ctx[key]),
    )
    .replace(
      /\$util\.toJson\(\$ctx\.(arguments|identity|source|request|prev)\)/g,
      (_, key) => JSON.stringify(ctx[key]),
    );
  const request = JSON.parse(rendered);
  assert.equal(request.operation, "Invoke");
  assert.deepEqual(request.payload, ctx);
  return request.payload;
};

let now,
  season,
  config,
  games,
  entries,
  picks,
  reads,
  writes,
  conditionalClears,
  profile;
beforeEach(() => {
  now = start;
  mock.method(Date, "now", () => now);
  season = { id: "season", year: 2030, status: "open", isActive: true };
  profile = {
    id: "profile",
    owner: PLAYER.sub,
    username: "Jake",
    usernameKey: "jake",
  };
  config = {
    id: "config",
    seasonId: "season",
    picksOpenAt: iso(-3600000),
    picksLockAt: iso(3600000),
    tieBreakerRequired: true,
  };
  games = [
    {
      id: "game-one",
      seasonId: "season",
      bowlName: "Test Bowl",
      kickoffAt: iso(3600000),
      status: "scheduled",
      teamAAbbr: "AAA",
      teamBAbbr: "BBB",
    },
    {
      id: "championship",
      seasonId: "season",
      bowlName:
        "College Football Playoff National Championship Presented by AT&T",
      kickoffAt: iso(7200000),
      status: "scheduled",
      teamAAbbr: "AAA",
      teamBAbbr: "BBB",
    },
  ];
  entries = [
    {
      id: "entry-one",
      seasonId: "season",
      owner: PLAYER.sub,
      entryName: "My picks",
      entryNameKey: "my picks",
      isDeleted: false,
      tieBreakerValue: 42,
    },
    {
      id: "entry-two",
      seasonId: "season",
      owner: "player-two",
      entryName: "Other picks",
      isDeleted: false,
      tieBreakerValue: 51,
    },
  ];
  picks = [];
  reads = [];
  writes = [];
  conditionalClears = [];
  client.graphql = async ({ query, variables, authMode }) => {
    assert.equal(authMode, "iam");
    if (query.includes("query EntryPicks")) {
      assert.equal(
        variables.filter?.gameId,
        undefined,
        "sort keys cannot be filtered",
      );
      const { entryId, gameId, ...options } = variables;
      const result = await client.models.Pick.pickByEntryAndGame(
        { entryId, gameId },
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
    }
    assert.match(
      query,
      /updatePick\(input: \$input, condition: \$condition\)/,
    );
    conditionalClears.push(variables);
    const pick = picks.find((row) => row.id === variables.input.id);
    if (
      !pick ||
      Object.entries(variables.condition).some(
        ([field, match]) => pick[field] !== match.eq,
      )
    )
      return {
        data: null,
        errors: [
          {
            errorType: "DynamoDB:ConditionalCheckFailedException",
            message: "The conditional request failed",
          },
        ],
      };
    pick.selectedTeam = variables.input.selectedTeam;
    return {
      data: {
        updatePick: Object.fromEntries(
          [
            "id",
            "entryId",
            "seasonId",
            "gameId",
            "selectedTeam",
            "createdAt",
            "updatedAt",
          ].map((field) => [field, pick[field]]),
        ),
      },
    };
  };
  const read =
    (label, fn) =>
    async (input, options = input) => {
      assert.equal(options.authMode, "iam");
      reads.push(label);
      return { data: fn(input) };
    };
  const write = (model, operation) => async (input, options) => {
    assert.equal(options.authMode, "iam");
    writes.push({ model, operation, input });
    const rows = model === "Entry" ? entries : picks;
    const existing = rows.find((row) => row.id === input.id);
    if (operation === "create") {
      if (existing)
        return {
          data: null,
          errors: [
            {
              errorType: "DynamoDB:ConditionalCheckFailedException",
              message: "The conditional request failed",
            },
          ],
        };
      rows.push({ ...input });
    } else {
      assert(existing);
      Object.assign(existing, input);
    }
    const stored = rows.find((row) => row.id === input.id);
    const data = Object.fromEntries(
      options.selectionSet.map((field) => [field, stored[field]]),
    );
    // Generated Entry field responses redact read-only ownership on model mutations.
    if (model === "Entry" && Object.hasOwn(data, "owner")) data.owner = null;
    return { data };
  };
  client.models = {
    Season: { get: read("Season.get", () => season) },
    SeasonConfig: {
      seasonConfigBySeasonId: read("SeasonConfig.index", () => [config]),
    },
    Game: { gamesBySeason: read("Game.index", () => games) },
    UserProfile: {
      get: read("UserProfile.get", () => profile),
      userProfileByOwner: read("UserProfile.ownerIndex", () =>
        profile ? [profile] : [],
      ),
    },
    Entry: {
      get: read("Entry.get", ({ id }) =>
        entries.find((entry) => entry.id === id),
      ),
      list: read("Entry.list", ({ filter }) =>
        entries.filter(
          (entry) =>
            (!filter?.owner || entry.owner === filter.owner.eq) &&
            (!filter?.seasonId || entry.seasonId === filter.seasonId.eq),
        ),
      ),
      create: write("Entry", "create"),
      update: write("Entry", "update"),
    },
    Pick: {
      get: read("Pick.get", ({ id }) => picks.find((pick) => pick.id === id)),
      pickByEntryAndGame: read("Pick.entryIndex", ({ entryId, gameId }) =>
        picks.filter(
          (pick) =>
            pick.entryId === entryId &&
            (!gameId || pick.gameId === gameId.eq),
        ),
      ),
      picksBySeason: read("Pick.seasonIndex", () => picks),
      create: write("Pick", "create"),
      update: write("Pick", "update"),
    },
  };
});
afterEach(() => mock.restoreAll());

test("createSeasonEntry dispatches generated arguments, derives owner, and keeps one active entry", async () => {
  entries = [];
  const created = await handler(event("createSeasonEntry"));
  assert.equal(created.id, "entry-season-player-one-0");
  assert.equal(created.owner, PLAYER.sub);
  assert.equal(created.userProfileId, "profile");
  assert.equal(created.entryName, "jake_picks_2030");
  assert.equal((await handler(event("createSeasonEntry"))).id, created.id);
  assert.equal(writes.length, 1);
});

test("updateSeasonEntry dispatches arguments and preserves immutable ownership/payment", async () => {
  const updated = await handler(
    event("updateSeasonEntry", {
      ...argsByField.updateSeasonEntry,
      owner: "forged",
      paymentStatus: "paid",
    }),
  );
  assert.equal(updated.entryName, "My picks");
  assert.equal(updated.tieBreakerValue, 42);
  assert.equal(updated.owner, PLAYER.sub);
  assert.deepEqual(writes[0].input, { id: "entry-one", tieBreakerValue: 42 });
});

test("saveSeasonPick dispatches create/update/deselection with persisted owner and deterministic ID", async () => {
  const first = await handler(event("saveSeasonPick"));
  assert.equal(first.id, "pick-entry-one-game-one");
  assert.equal(first.owner, undefined);
  assert.equal(picks[0].owner, PLAYER.sub);
  await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "BBB",
    }),
  );
  await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "",
    }),
  );
  assert.equal(picks.length, 1);
  assert.equal(picks[0].selectedTeam, "");
  assert.deepEqual(
    writes.map(({ operation }) => operation),
    ["create", "update", "update"],
  );
});

test("clearing every game preserves both entries, the tiebreaker and another player's picks", async () => {
  picks = entries.flatMap((entry) =>
    games.map((game) => ({
      id: `pick-${entry.id}-${game.id}`,
      entryId: entry.id,
      gameId: game.id,
      seasonId: "season",
      owner: entry.owner,
      selectedTeam: "AAA",
    })),
  );
  const originalEntries = structuredClone(entries);
  const otherPicks = structuredClone(
    picks.filter((pick) => pick.owner !== PLAYER.sub),
  );
  for (const game of games) {
    const cleared = await handler(
      event("saveSeasonPick", {
        entryId: "entry-one",
        gameId: game.id,
        selectedTeam: "",
      }),
    );
    assert.equal(cleared.selectedTeam, "");
  }
  assert.deepEqual(entries, originalEntries);
  assert.deepEqual(
    picks.filter((pick) => pick.owner !== PLAYER.sub),
    otherPicks,
  );
  assert(
    writes.every(
      ({ model, operation }) => model === "Pick" && operation === "update",
    ),
  );
  const fresh = await handler(
    event(
      "visibleSeasonPicks",
      { seasonId: "season" },
      structuredClone(PLAYER),
    ),
  );
  assert(
    fresh.picks.every(
      (pick) => pick.entryId === "entry-one" && pick.selectedTeam === "",
    ),
  );
  assert.equal(fresh.completeEntryIds.includes("entry-one"), false);
  assert.deepEqual(fresh.tieBreakers, [{ entryId: "entry-one", value: 42 }]);
});

test("clear mutations reject locked seasons and foreign ownership before writes", async () => {
  const args = { ...argsByField.saveSeasonPick, selectedTeam: "" };
  await assert.rejects(
    handler(event("saveSeasonPick", args, { ...PLAYER, sub: "player-two" })),
    /another player's entry/,
  );
  now = start + 3600000;
  await assert.rejects(handler(event("saveSeasonPick", args)), /locked/);
  assert.equal(writes.length, 0);
  assert.equal(conditionalClears.length, 0);
});

test("a deadline reached during a multi-game clear stops remaining writes without reverting acknowledged clears", async () => {
  picks = games.map((game) => ({
    id: `pick-entry-one-${game.id}`,
    entryId: "entry-one",
    gameId: game.id,
    seasonId: "season",
    owner: PLAYER.sub,
    selectedTeam: "AAA",
  }));
  const update = client.models.Pick.update;
  client.models.Pick.update = async (...args) => {
    const result = await update(...args);
    now = start + 3600000;
    return result;
  };
  await handler(
    event("saveSeasonPick", {
      entryId: "entry-one",
      gameId: games[0].id,
      selectedTeam: "",
    }),
  );
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        entryId: "entry-one",
        gameId: games[1].id,
        selectedTeam: "",
      }),
    ),
    /locked/,
  );
  assert.equal(picks[0].selectedTeam, "");
  assert.equal(picks[1].selectedTeam, "AAA");
  assert.equal(writes.length, 1);
});

test("current-pick lookup uses the index sort key and cannot confuse another game's pick", async () => {
  const requests = [];
  const original = client.graphql;
  client.graphql = async (request) => {
    requests.push(request);
    return original(request);
  };
  await handler(event("saveSeasonPick"));
  await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      gameId: "championship",
    }),
  );
  assert.equal(picks.length, 2);
  assert.deepEqual(
    requests.map(({ variables }) => variables.gameId),
    [{ eq: "game-one" }, { eq: "championship" }],
  );
  assert(requests.every(({ variables }) => !variables.filter?.gameId));
});

test("null, malformed and partial current-pick reads never proceed to a write", async () => {
  for (const response of [
    { data: { pickByEntryAndGame: null } },
    { data: { pickByEntryAndGame: { items: null } } },
    {
      data: { pickByEntryAndGame: { items: [] } },
      errors: [{ message: "DynamoDB lookup failed" }],
    },
  ]) {
    client.graphql = async () => response;
    await assert.rejects(
      handler(event("saveSeasonPick")),
      /Load current pick:/,
    );
    assert.equal(writes.length, 0);
  }
});

test("a later pick page error prevents writes and preserves the original GraphQL message", async () => {
  let calls = 0;
  client.graphql = async ({ variables }) => {
    if (++calls === 1) {
      assert.equal(variables.nextToken, undefined);
      return {
        data: { pickByEntryAndGame: { items: [], nextToken: "second" } },
      };
    }
    assert.equal(variables.nextToken, "second");
    throw {
      data: { pickByEntryAndGame: null },
      errors: [{ message: "Not authorized to access pick" }],
    };
  };
  await assert.rejects(
    handler(event("saveSeasonPick")),
    /Load current pick: Not authorized/,
  );
  assert.equal(writes.length, 0);
});

test("the server rechecks its deadline after the current-pick read", async () => {
  const original = client.graphql;
  client.graphql = async (request) => {
    const result = await original(request);
    now = start + 3600000;
    return result;
  };
  await assert.rejects(handler(event("saveSeasonPick")), /locked/);
  assert.equal(writes.length, 0);
});

test("a delayed entry index cannot create over a saved pick or block its clear", async () => {
  await handler(event("saveSeasonPick"));
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "BBB",
    }),
  );
  await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "",
    }),
  );
  assert.equal(picks.length, 1);
  assert.equal(picks[0].selectedTeam, "");
  assert.deepEqual(
    writes.map(({ operation }) => operation),
    ["create", "update", "update"],
  );
});

test("clearing an absent pick confirms an empty record under the create condition", async () => {
  const cleared = await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "",
    }),
  );
  assert.equal(cleared.selectedTeam, "");
  assert.equal(cleared.gameId, "game-one");
  assert.equal(picks.length, 1);
  assert.equal(picks[0].selectedTeam, "");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].operation, "create");
  assert.equal(conditionalClears.length, 1);
});

test("a clear wins even when both generated reads lag behind a recent create", async () => {
  picks = [
    {
      id: "pick-entry-one-game-one",
      entryId: "entry-one",
      gameId: "game-one",
      seasonId: "season",
      owner: PLAYER.sub,
      selectedTeam: "AAA",
    },
  ];
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  client.models.Pick.get = async () => ({ data: null });
  const cleared = await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "",
    }),
  );
  assert.equal(cleared.selectedTeam, "");
  assert.equal(picks[0].selectedTeam, "");
  assert.deepEqual(conditionalClears[0].condition, {
    owner: { eq: PLAYER.sub },
    entryId: { eq: "entry-one" },
    gameId: { eq: "game-one" },
    seasonId: { eq: "season" },
  });
});

test("conditional clear never changes a conflicting stored owner", async () => {
  picks = [
    {
      id: "pick-entry-one-game-one",
      entryId: "entry-one",
      gameId: "game-one",
      seasonId: "season",
      owner: "another-owner",
      selectedTeam: "AAA",
    },
  ];
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  const originalGet = client.models.Pick.get;
  let getCalls = 0;
  client.models.Pick.get = async (...args) =>
    ++getCalls === 1 ? { data: null } : originalGet(...args);
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        selectedTeam: "",
      }),
    ),
    /conflicting ownership/,
  );
  assert.equal(picks[0].selectedTeam, "AAA");
});

test("a clear with entirely invisible conflicting data fails instead of falsely confirming absence", async () => {
  picks = [
    {
      id: "pick-entry-one-game-one",
      entryId: "entry-one",
      gameId: "game-one",
      seasonId: "season",
      owner: "another-owner",
      selectedTeam: "AAA",
    },
  ];
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  client.models.Pick.get = async () => ({ data: null });
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        selectedTeam: "",
      }),
    ),
    /Clear pick: The conditional request failed/,
  );
  assert.equal(picks[0].owner, "another-owner");
  assert.equal(picks[0].selectedTeam, "AAA");
});

test("an absent clear rechecks the deadline before its conditional create", async () => {
  const original = client.graphql;
  client.graphql = async (request) => {
    const result = await original(request);
    if (request.query.includes("mutation ClearUnseenPick"))
      now = start + 3600000;
    return result;
  };
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        selectedTeam: "",
      }),
    ),
    /locked/,
  );
  assert.equal(writes.length, 0);
});

test("unresolved conditional creates fail closed without replacing an invisible saved selection", async () => {
  picks = [
    {
      id: "pick-entry-one-game-one",
      entryId: "entry-one",
      gameId: "game-one",
      seasonId: "season",
      owner: PLAYER.sub,
      selectedTeam: "BBB",
    },
  ];
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  client.models.Pick.get = async () => ({ data: null });
  await assert.rejects(
    handler(event("saveSeasonPick")),
    /still becoming visible/,
  );
  assert.equal(picks[0].selectedTeam, "BBB");
});

test("a primary-key create conflict rechecks stored ownership and retries as an update", async () => {
  client.models.Pick.pickByEntryAndGame = async () => ({ data: [] });
  const originalGet = client.models.Pick.get;
  let readsById = 0;
  client.models.Pick.get = async (...args) => {
    readsById += 1;
    return readsById === 1 ? { data: null } : originalGet(...args);
  };
  picks = [
    {
      id: "pick-entry-one-game-one",
      entryId: "entry-one",
      gameId: "game-one",
      seasonId: "season",
      owner: PLAYER.sub,
      selectedTeam: "AAA",
    },
  ];
  const saved = await handler(
    event("saveSeasonPick", {
      ...argsByField.saveSeasonPick,
      selectedTeam: "BBB",
    }),
  );
  assert.equal(saved.selectedTeam, "BBB");
  assert.equal(picks.length, 1);
  assert.deepEqual(
    writes.map(({ operation }) => operation),
    ["create", "update"],
  );
});

test("visibleSeasonPicks dispatch preserves pre-kickoff privacy and reveals each game/tiebreaker at kickoff", async () => {
  picks = entries.flatMap((entry) =>
    games.map((game) => ({
      id: `pick-${entry.id}-${game.id}`,
      entryId: entry.id,
      seasonId: "season",
      gameId: game.id,
      owner: entry.owner,
      selectedTeam: "AAA",
    })),
  );
  const before = await handler(event("visibleSeasonPicks"));
  assert.equal(before.picks.length, 2);
  assert(
    before.picks.every(
      (pick) => pick.entryId === "entry-one" && !("owner" in pick),
    ),
  );
  assert.deepEqual(before.completeEntryIds, ["entry-one", "entry-two"]);
  assert.deepEqual(before.tieBreakers, [{ entryId: "entry-one", value: 42 }]);
  assert.deepEqual(before.submissionCounts, [
    { gameId: "game-one", count: 2 },
    { gameId: "championship", count: 2 },
  ]);
  now = start + 3600000;
  assert.equal((await handler(event("visibleSeasonPicks"))).picks.length, 3);
  now = start + 7200000;
  const after = await handler(event("visibleSeasonPicks"));
  assert.equal(after.picks.length, 4);
  assert.equal(after.tieBreakers.length, 2);
  assert.equal(writes.length, 0);
});

for (const field of Object.keys(argsByField)) {
  test(`${field} rejects an anonymous generated request without writes`, async () => {
    await assert.rejects(
      handler(event(field, argsByField[field], null)),
      /signed-in player/,
    );
    assert.equal(writes.length, 0);
  });
}

for (const field of [
  "createSeasonEntry",
  "updateSeasonEntry",
  "saveSeasonPick",
]) {
  test(`${field} keeps player-group checks, admin exclusion, opening time and server locking`, async () => {
    for (const identity of [
      { sub: "pending", groups: [] },
      { sub: PLAYER.sub, groups: ["player", "admin"] },
    ])
      await assert.rejects(
        handler(event(field, argsByField[field], identity)),
        /Only player accounts/,
      );
    now = start - 7200000;
    await assert.rejects(handler(event(field)), /not open yet/);
    now = start + 3600000;
    await assert.rejects(handler(event(field)), /locked/);
    config.picksLockAt = iso(10800000); // Earliest kickoff must still tighten it.
    await assert.rejects(handler(event(field)), /locked/);
    assert.equal(writes.length, 0);
  });
}

test("update/save reject foreign or deleted entries; save rejects a foreign game or team", async () => {
  for (const field of ["updateSeasonEntry", "saveSeasonPick"]) {
    await assert.rejects(
      handler(event(field, { ...argsByField[field], entryId: "entry-two" })),
      /another player's entry/,
    );
    entries[0].isDeleted = true;
    await assert.rejects(handler(event(field)), /not found/);
    entries[0].isDeleted = false;
  }
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        gameId: "foreign-game",
      }),
    ),
    /does not belong/,
  );
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        selectedTeam: "FORGED",
      }),
    ),
    /does not belong/,
  );
  games.push({ ...games[0], id: "fcs-game", bowlName: "FCS Championship" });
  await assert.rejects(
    handler(
      event("saveSeasonPick", {
        ...argsByField.saveSeasonPick,
        gameId: "fcs-game",
      }),
    ),
    /not eligible/,
  );
  assert.equal(writes.length, 0);
});

test("unknown/missing/nested-info/action operations fail closed before any model access", async () => {
  for (const request of [
    event("unknown"),
    { identity: PLAYER },
    { identity: PLAYER, info: { fieldName: "saveSeasonPick" } },
    {
      identity: PLAYER,
      action: "saveSeasonPick",
      arguments: argsByField.saveSeasonPick,
    },
  ])
    await assert.rejects(handler(request), /Unsupported pick operation/);
  assert.equal(reads.length, 0);
  assert.equal(writes.length, 0);
});

test("names use the owned app profile and selected season year, ignoring client/Cognito naming", async () => {
  entries = [];
  season.year = 2042;
  const created = await handler(
    event(
      "createSeasonEntry",
      {
        seasonId: "season",
        contactEmail: "player@example.com",
        entryName: "Forged",
        username: "attacker",
        owner: "other",
      },
      {
        ...PLAYER,
        username: "opaque-cognito-login",
        claims: { sub: PLAYER.sub, email: "not-the-name@example.com" },
      },
    ),
  );
  assert.equal(created.entryName, "jake_picks_2042");
  assert.equal(created.owner, PLAYER.sub);
  assert.equal(created.userProfileId, profile.id);
  assert.equal(created.entryNameKey, "jake_picks_2042");
});

test("concurrent creates contend on one deterministic record and safely return the stored entry", async () => {
  entries = [];
  const [first, second] = await Promise.all([
    handler(event("createSeasonEntry")),
    handler(event("createSeasonEntry")),
  ]);
  assert.equal(entries.length, 1);
  assert.equal(first.id, second.id);
  assert.equal(first.owner, PLAYER.sub);
  assert.equal(second.owner, PLAYER.sub);
});

test("new creation rejects missing, unsafe, foreign profiles and missing authoritative season year", async () => {
  entries = [];
  for (const invalid of [
    null,
    { ...profile, username: "bad/name" },
    { ...profile, owner: "foreign" },
    { ...profile, usernameKey: "forged" },
  ]) {
    const original = profile;
    profile = invalid;
    await assert.rejects(
      handler(event("createSeasonEntry")),
      /profile|username/,
    );
    profile = original;
  }
  await assert.rejects(
    handler(
      event("createSeasonEntry", {
        ...argsByField.createSeasonEntry,
        userProfileId: "foreign",
      }),
    ),
    /profile/,
  );
  delete season.year;
  await assert.rejects(handler(event("createSeasonEntry")), /season's year/);
  assert.equal(writes.length, 0);
});

test("legacy entry is reused without renaming and another season's entry does not block creation", async () => {
  const existing = await handler(event("createSeasonEntry"));
  assert.equal(existing.id, "entry-one");
  assert.equal(existing.entryName, "My picks");
  assert.equal(writes.length, 0);
  entries = [{ ...entries[0], seasonId: "test26" }];
  const created = await handler(event("createSeasonEntry"));
  assert.equal(created.seasonId, "season");
  assert.equal(entries[0].entryName, "My picks");
  assert.equal(writes.length, 1);
});

test("custom Entry responses contain the stored owner after model mutation redaction", async () => {
  entries = [];
  const created = await handler(event("createSeasonEntry"));
  assert.equal(created.owner, PLAYER.sub);
  assert.ok(reads.includes("Entry.get"));
  await handler(
    event("updateSeasonEntry", {
      entryId: created.id,
      tieBreakerValue: 53,
      entryName: "client rename",
    }),
  );
  assert.equal(entries[0].entryName, "jake_picks_2030");
  assert.equal(entries[0].tieBreakerValue, 53);
});
