import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  SeasonStatus: a.enum(["draft", "open", "locked", "complete", "archived"]),
  GameStatus: a.enum(["scheduled", "final", "canceled"]),
  PaymentStatus: a.enum(["unpaid", "paid", "waived", "refunded"]),

  UserProfile: a
    .model({
      owner: a.string(),
      email: a.email().required(),
      displayName: a.string().required(),
      preferredGroup: a.string(),
      entries: a.hasMany("Entry", "userProfileId"),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("owner").to(["create", "read", "update"]),
      allow.group("admin").to(["read", "update", "delete"]),
    ]),

  Season: a
    .model({
      year: a.integer().required(),
      name: a.string().required(),
      slug: a.string().required(),
      status: a.ref("SeasonStatus").required(),
      entryFeeCents: a.integer().required(),
      isActive: a.boolean().required(),
      config: a.hasOne("SeasonConfig", "seasonId"),
      games: a.hasMany("Game", "seasonId"),
      entries: a.hasMany("Entry", "seasonId"),
      picks: a.hasMany("Pick", "seasonId"),
    })
    .secondaryIndexes((index) => [index("slug").queryField("seasonBySlug")])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  SeasonConfig: a
    .model({
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      picksOpenAt: a.datetime().required(),
      picksLockAt: a.datetime().required(),
      maxEntriesPerUser: a.integer(),
      tieBreakerLabel: a.string(),
      tieBreakerRequired: a.boolean(),
      scoringConfigJson: a.json(),
    })
    .secondaryIndexes((index) => [
      index("seasonId").queryField("seasonConfigBySeasonId"),
    ])
    .authorization((allow) => [allow.group("admin")]),

  Game: a
    .model({
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      gameNumber: a.integer(),
      sortOrder: a.integer(),
      bowlName: a.string().required(),
      gameName: a.string(),
      teamA: a.string().required(),
      teamB: a.string().required(),
      kickoffAt: a.datetime().required(),
      neutralSite: a.boolean(),
      location: a.string(),
      winnerTeam: a.string(),
      status: a.ref("GameStatus").required(),
      picks: a.hasMany("Pick", "gameId"),
    })
    .secondaryIndexes((index) => [
      index("seasonId").sortKeys(["kickoffAt"]).queryField("gamesBySeason"),
    ])
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  Entry: a
    .model({
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      owner: a.string(),
      userProfileId: a.id(),
      userProfile: a.belongsTo("UserProfile", "userProfileId"),
      entryName: a.string().required(),
      entryNameKey: a.string().required(),
      contactEmail: a.email().required(),
      paymentStatus: a.ref("PaymentStatus").required(),
      paidAt: a.datetime(),
      tieBreakerValue: a.integer(),
      isDeleted: a.boolean().required().default(false),
      submittedAt: a.datetime(),
      lockedAt: a.datetime(),
      picks: a.hasMany("Pick", "entryId"),
    })
    .secondaryIndexes((index) => [
      index("owner").sortKeys(["seasonId"]).queryField("entriesByOwner"),
      index("seasonId")
        .sortKeys(["entryNameKey"])
        .queryField("entriesBySeasonAndEntryNameKey"),
    ])
    .authorization((allow) => [
      allow.ownerDefinedIn("owner").to(["create", "read", "update"]),
      allow.group("admin"),
    ]),

  Pick: a
    .model({
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      entryId: a.id().required(),
      entry: a.belongsTo("Entry", "entryId"),
      gameId: a.id().required(),
      game: a.belongsTo("Game", "gameId"),
      owner: a.string(),
      selectedTeam: a.string().required(),
      confidencePoints: a.integer(),
      rank: a.integer(),
      isCorrect: a.boolean(),
      pointsAwarded: a.integer(),
      overriddenByAdminActionId: a.id(),
    })
    .secondaryIndexes((index) => [
      index("entryId").sortKeys(["gameId"]).queryField("pickByEntryAndGame"),
      index("gameId").queryField("picksByGame"),
    ])
    .authorization((allow) => [
      allow.ownerDefinedIn("owner"),
      allow.group("admin"),
    ]),

  AdminAction: a
    .model({
      actionType: a.string().required(),
      targetModel: a.string().required(),
      targetId: a.string().required(),
      reason: a.string(),
      beforeJson: a.json(),
      afterJson: a.json(),
      createdBy: a.string().required(),
      createdAt: a.datetime(),
    })
    .disableOperations(["update", "delete"])
    .authorization((allow) => [allow.group("admin").to(["create", "read"])]),

  ArchivedSubmission: a
    .model({
      legacySubmissionId: a.string(),
      seasonLabel: a.string().required(),
      entryName: a.string().required(),
      displayName: a.string(),
      picksJson: a.json(),
      score: a.integer(),
      tieBreakerValue: a.integer(),
      importedAt: a.datetime(),
      source: a.string(),
    })
    .authorization((allow) => [allow.group("admin")]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

/**
 * TODO:
 * - Entry name uniqueness is only partially supported here via
 *   `entriesBySeasonAndEntryNameKey`. Enforcing uniqueness only among
 *   non-deleted entries still requires a later custom mutation or server-side
 *   validation step.
 * - Pick ownership is duplicated onto the Pick model so owner auth can work
 *   without broad raw reads. Future write paths should ensure `pick.owner`
 *   always matches the owning Entry record.
 */
