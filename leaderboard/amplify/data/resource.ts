// DATA — APP — AMPLIFY DATA
// Model-level rules are the authoritative boundary for player ownership and admin-only corrections.
import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

// Amplify's schema builder (`a`), deployment wrapper (`defineData`), and generated-client
// type helper (`ClientSchema`) turn this definition into GraphQL/AppSync types, resolvers,
// authorization checks, and DynamoDB-backed model resources.
// `a.schema` is the source of truth for the generated data API. Enum declarations constrain
// GraphQL inputs and generated client types to the listed lifecycle values.
const schema = a.schema({
  // Bowl-season lifecycle from private preparation through long-term archival.
  SeasonStatus: a.enum(["draft", "open", "locked", "complete", "archived"]),
  // Schedule/result state used while games progress from kickoff to a final result.
  GameStatus: a.enum(["scheduled", "in_progress", "final", "canceled"]),
  // Admin-managed entry payment state; missing/redacted values are treated as unpaid by the UI.
  PaymentStatus: a.enum(["unpaid", "paid", "waived", "refunded"]),

  // A player's application identity. Public naming fields support standings, while field rules
  // keep account contact data within the owner/admin security boundary.
  UserProfile: a
    .model({
      // Optional Cognito subject (`sub`) stored as the record's owner key. Owner-defined rules
      // compare this value with the signed-in caller's immutable identity claim.
      owner: a.string(),
      // Optional contact address. Field authorization redacts it from broad profile reads;
      // its owner can create/read/update it and admins can read/update it.
      email: a
        .email()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Required player-facing display name. Authenticated reads support leaderboards; only
      // the owner or an admin can write it.
      username: a
        .string()
        .required()
        .authorization((allow) => [
          allow.authenticated().to(["read"]),
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Required normalized username for lookup/availability checks, with the same write
      // boundary as `username` and broad authenticated reads for discovery.
      usernameKey: a
        .string()
        .required()
        .authorization((allow) => [
          allow.authenticated().to(["read"]),
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Optional player preference used to group or present their entries.
      preferredGroup: a.string(),
      // Virtual one-to-many connection to Entry records whose `userProfileId` is this profile.
      entries: a.hasMany("Entry", "userProfileId"),
    })
    // DynamoDB secondary indexes expose named generated-client queries for direct owner and
    // normalized-username lookups without scanning all profiles.
    .secondaryIndexes((index) => [
      index("owner").queryField("userProfileByOwner"),
      index("usernameKey").queryField("userProfileByUsernameKey"),
    ])
    // Signed-in users may read profiles for standings. A matching Cognito `sub` may
    // create/read/update its profile, while the `admin` group may read/update/delete it.
    // Field-level rules above further restrict protected values.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow
        .ownerDefinedIn("owner")
        .identityClaim("sub")
        .to(["create", "read", "update"]),
      allow.group("admin").to(["read", "update", "delete"]),
    ]),

  // A bowl-pick contest season and the parent of its configuration, games, entries, and picks.
  Season: a
    .model({
      // Required calendar year displayed in season navigation.
      year: a.integer().required(),
      // Required human-readable season name.
      name: a.string().required(),
      // Required URL/lookup-safe key; the secondary index supports direct loading.
      slug: a.string().required(),
      // Required reference to the constrained SeasonStatus enum.
      status: a.ref("SeasonStatus").required(),
      // Required fee in integer cents, avoiding floating-point currency storage.
      entryFeeCents: a.integer().required(),
      // Required application flag identifying a season as active for current workflows.
      isActive: a.boolean().required(),
      // Explicitly enables future test-only admin game tools. This is never
      // inferred from the season lifecycle or player pick-lock state.
      isTestSeason: a.boolean().default(false),
      // One-to-one configuration resolved through SeasonConfig's `seasonId` foreign key.
      config: a.hasOne("SeasonConfig", "seasonId"),
      // Reverse one-to-many relationships resolved through each child model's `seasonId`.
      games: a.hasMany("Game", "seasonId"),
      entries: a.hasMany("Entry", "seasonId"),
      picks: a.hasMany("Pick", "seasonId"),
    })
    // Creates a slug index and generated `seasonBySlug` query for route-level lookup.
    .secondaryIndexes((index) => [index("slug").queryField("seasonBySlug")])
    // All authenticated players can read seasons; admins receive the full default operation set.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  // Per-season timing and rules, separated from the season's public identity and status.
  SeasonConfig: a
    .model({
      // Required foreign key referencing the parent Season record.
      seasonId: a.id().required(),
      // Belongs-to navigation resolved with `seasonId`; it does not duplicate Season data.
      season: a.belongsTo("Season", "seasonId"),
      // Required timestamps defining when selection begins and when writes should lock.
      picksOpenAt: a.datetime().required(),
      picksLockAt: a.datetime().required(),
      // Optional cap; absence means the schema itself supplies no per-user maximum.
      maxEntriesPerUser: a.integer(),
      // Optional presentation and requirement controls for the season's tiebreaker.
      tieBreakerLabel: a.string(),
      tieBreakerRequired: a.boolean(),
      // Optional schemaless JSON for scoring rules interpreted by application code.
      scoringConfigJson: a.json(),
    })
    // Supports parent-key lookup through the generated `seasonConfigBySeasonId` query.
    .secondaryIndexes((index) => [
      index("seasonId").queryField("seasonConfigBySeasonId"),
    ])
    // Players may read configuration; admins receive the full default operation set.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  // A scheduled bowl matchup and its live/final scoring metadata, maintained through admin or
  // authorized ingestion workflows and read by players making and following picks.
  Game: a
    .model({
      // Required parent key and belongs-to navigation back to the Season.
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      // Optional upstream identifier used to correlate imported schedule updates.
      sourceEventId: a.string(),
      // Optional sequence values for labels and deterministic presentation order.
      gameNumber: a.integer(),
      sortOrder: a.integer(),
      // Required official bowl label plus optional alternate label/network/status detail.
      bowlName: a.string().required(),
      gameName: a.string(),
      network: a.string(),
      statusDetail: a.string(),
      // Team A's required canonical name/abbreviation and optional display, branding, rank,
      // and score metadata supplied by schedule/results data.
      teamA: a.string().required(),
      teamADisplayName: a.string(),
      teamAAbbr: a.string().required(),
      teamALogo: a.string(),
      teamAColor: a.string(),
      teamAAlternateColor: a.string(),
      teamARank: a.integer(),
      teamAScore: a.integer(),
      // Team B mirrors Team A's required identity and optional presentation/result metadata.
      teamB: a.string().required(),
      teamBDisplayName: a.string(),
      teamBAbbr: a.string().required(),
      teamBLogo: a.string(),
      teamBColor: a.string(),
      teamBAlternateColor: a.string(),
      teamBRank: a.integer(),
      teamBScore: a.integer(),
      // Required kickoff time drives display and chronological index ordering. Venue details
      // remain optional because imported schedules may be incomplete.
      kickoffAt: a.datetime().required(),
      neutralSite: a.boolean(),
      venueName: a.string(),
      location: a.string(),
      // Optional winner populated when a result is known.
      winnerTeam: a.string(),
      // Required reference to the constrained GameStatus lifecycle enum.
      status: a.ref("GameStatus").required(),
      // Reverse relationship to Pick records whose required `gameId` references this game.
      picks: a.hasMany("Pick", "gameId"),
    })
    // Composite DynamoDB index powers generated `gamesBySeason`, chronologically sorted by
    // required `kickoffAt` within a season.
    .secondaryIndexes((index) => [
      index("seasonId").sortKeys(["kickoffAt"]).queryField("gamesBySeason"),
    ])
    // Schedule/results are readable by authenticated players; admins receive all operations.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  Entry: a
    // DATA — ENTRIES — AMPLIFY DATA
    // Entry-level payment and tiebreaker fields allow one player to own multiple independent submissions.
    .model({
      // Required parent-season foreign key and its belongs-to navigation. Amplify stores the ID
      // on Entry and resolves `season` as a related model subject to Season authorization.
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      // Optional Cognito subject copied onto the entry for owner-defined authorization. The
      // owner can create/read/update this field; admins can read/update it.
      owner: a
        .string()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Optional UserProfile foreign key. Its field rule prevents unrelated players from seeing
      // or changing the account linkage even when public Entry fields are readable.
      userProfileId: a
        .id()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Belongs-to navigation resolved from `userProfileId`; nullable because the key is nullable.
      userProfile: a.belongsTo("UserProfile", "userProfileId"),
      // Required player-supplied entry label shown in standings.
      entryName: a.string().required(),
      // Required normalized label used as the season index sort key for lookup/uniqueness checks.
      entryNameKey: a.string().required(),
      // Optional private contact address. It must remain nullable so field-level redaction can
      // return public Entry data without exposing this field to non-owners.
      contactEmail: a
        .email()
        // Restricted fields stay nullable so non-owners can read public entry data without exposing private values.
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["create", "read", "update"]),
        ]),
      // Optional admin-controlled payment enum. The owner has read only; only admins may create
      // or update it. Null can mean absent or redacted and is treated as `unpaid` in player UI.
      paymentStatus: a
        .ref("PaymentStatus")
        // Admins persist payment state; player-facing reads treat a missing or redacted value as unpaid.
        .authorization((allow) => [
          allow.ownerDefinedIn("owner").identityClaim("sub").to(["read"]),
          allow.group("admin").to(["create", "read", "update"]),
        ]),
      // Optional payment timestamp protected from broad reads. The schema permits the owner to
      // create/read/update it and admins to read/update it; no default is generated.
      paidAt: a
        .datetime()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Optional player tiebreaker answer; whether it is required is season configuration.
      tieBreakerValue: a.integer(),
      // Required soft-delete marker. Amplify supplies `false` when omitted on creation; records
      // remain stored so application queries can exclude them without physical deletion.
      isDeleted: a.boolean().required().default(false),
      // Optional submission timestamp, field-restricted to the entry owner and admins.
      submittedAt: a
        .datetime()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Optional timestamp recording when this entry became immutable in the product workflow;
      // its owner/admin field boundary matches `submittedAt`.
      lockedAt: a
        .datetime()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Reverse one-to-many relationship to Pick records carrying this entry's required ID.
      picks: a.hasMany("Pick", "entryId"),
    })
    // Owner+season supports listing a player's entries for one season. Season+normalized name
    // supports ordered lookup through the exact generated query names below; indexes do not by
    // themselves enforce uniqueness.
    .secondaryIndexes((index) => [
      index("owner").sortKeys(["seasonId"]).queryField("entriesByOwner"),
      index("seasonId")
        .sortKeys(["entryNameKey"])
        .queryField("entriesBySeasonAndEntryNameKey"),
    ])
    // Authenticated users can read leaderboard-safe Entry data. A caller whose Cognito `sub`
    // matches `owner` can create/read/update their entry; admins have all model operations.
    // Explicit `sub` must match field-level owner rules to avoid duplicate generated owner args.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow
        .ownerDefinedIn("owner")
        .identityClaim("sub")
        .to(["create", "read", "update"]),
      allow.group("admin"),
    ]),

  Pick: a
    // DATA — PICKS — AMPLIFY DATA
    // Duplicating owner onto Pick enables owner authorization without granting broad entry reads.
    .model({
      // Required Season foreign key and belongs-to navigation for season-wide pick access.
      seasonId: a.id().required(),
      season: a.belongsTo("Season", "seasonId"),
      // Required Entry foreign key and belongs-to navigation identifying the submitted card.
      entryId: a.id().required(),
      entry: a.belongsTo("Entry", "entryId"),
      // Required Game foreign key and belongs-to navigation identifying the matchup selected.
      gameId: a.id().required(),
      game: a.belongsTo("Game", "gameId"),
      // Optional duplicated Cognito subject used for direct Pick owner authorization. The field
      // owner can create/read/update it; admins can read/update it.
      owner: a
        .string()
        .authorization((allow) => [
          allow
            .ownerDefinedIn("owner")
            .identityClaim("sub")
            .to(["create", "read", "update"]),
          allow.group("admin").to(["read", "update"]),
        ]),
      // Required player selection stored as the chosen team identifier/name used by the app.
      selectedTeam: a.string().required(),
      // Optional confidence value when the season's scoring format uses confidence points.
      confidencePoints: a.integer(),
      // Optional ordering/ranking value used by scoring or presentation workflows.
      rank: a.integer(),
      // Optional computed result and awarded score, populated after game evaluation.
      isCorrect: a.boolean(),
      pointsAwarded: a.integer(),
      // Optional reference to the audit record associated with an administrative override.
      overriddenByAdminActionId: a.id(),
    })
    // Entry+game supports locating one entry's pick for a matchup; game and season indexes support
    // scoring/standings access patterns through the named generated queries.
    .secondaryIndexes((index) => [
      index("entryId").sortKeys(["gameId"]).queryField("pickByEntryAndGame"),
      index("gameId").queryField("picksByGame"),
      index("seasonId").queryField("picksBySeason"),
    ])
    // Authenticated players can read picks for standings. The matching `sub` owner receives the
    // rule's unchanged default operations, and admins receive all operations. Using `sub` here
    // consistently with the field rule prevents duplicate GraphQL subscription owner arguments.
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.ownerDefinedIn("owner").identityClaim("sub"),
      allow.group("admin"),
    ]),

  AdminAction: a
    // ADMIN — PAYMENT STATUS — AMPLIFY DATA
    // Immutable audit records preserve privileged corrections after payment or scoring changes.
    .model({
      // Required category naming the privileged action that occurred.
      actionType: a.string().required(),
      // Required target model name and record identifier for audit traceability.
      targetModel: a.string().required(),
      targetId: a.string().required(),
      // Optional administrator explanation for the correction.
      reason: a.string(),
      // Optional schemaless before/after snapshots; application code owns their JSON shape.
      beforeJson: a.json(),
      afterJson: a.json(),
      // Required actor identifier recorded by the privileged write path.
      createdBy: a.string().required(),
      // Optional business audit timestamp, separate from Amplify-managed model metadata.
      createdAt: a.datetime(),
    })
    // Amplify omits generated update/delete operations, making audit records append-only through
    // the data API. Only `admin` group members can create and read them.
    .disableOperations(["update", "delete"])
    .authorization((allow) => [allow.group("admin").to(["create", "read"])]),

  // Admin-only storage for submissions imported from a legacy season or system.
  ArchivedSubmission: a
    .model({
      // Optional identifier retained from the source system for reconciliation.
      legacySubmissionId: a.string(),
      // Required source-season label and entry name preserve the submission's core identity.
      seasonLabel: a.string().required(),
      entryName: a.string().required(),
      // Optional historical display name when it differs from the entry label.
      displayName: a.string(),
      // Optional schemaless snapshot of legacy picks; its structure is not enforced by GraphQL.
      picksJson: a.json(),
      // Optional historical score and tiebreaker result.
      score: a.integer(),
      tieBreakerValue: a.integer(),
      // Optional import timestamp and source-system label for provenance.
      importedAt: a.datetime(),
      source: a.string(),
    })
    // The `admin` group receives the default full operation set; players have no model access.
    .authorization((allow) => [allow.group("admin")]),
});

// Exposes generated model/operation types to frontend code without creating runtime behavior.
export type Schema = ClientSchema<typeof schema>;

// Registers the schema with Amplify Data. Cognito User Pools are the default authorization mode,
// so unauthenticated/API-key access is not configured by this file.
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
 * - Username availability will be checked client-side via
 *   `userProfileByUsernameKey`, but true race-condition-safe global username
 *   reservation still needs a later custom mutation or server-side strategy.
 * - Pick ownership is duplicated onto the Pick model so owner auth can work
 *   without broad raw reads. Future write paths should ensure `pick.owner`
 *   always matches the owning Entry record.
 */
