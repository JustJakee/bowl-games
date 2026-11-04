import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse, print, valueFromASTUntyped } from "graphql";

const operations = {
  createSeasonEntry: {
    type: "Mutation",
    arguments: {
      seasonId: "ID!",
      entryName: "String",
      contactEmail: "AWSEmail!",
      userProfileId: "ID",
    },
  },
  updateSeasonEntry: {
    type: "Mutation",
    arguments: {
      entryId: "ID!",
      entryName: "String",
      contactEmail: "AWSEmail",
      tieBreakerValue: "Int",
      userProfileId: "ID",
      isDeleted: "Boolean",
    },
  },
  saveSeasonPick: {
    type: "Mutation",
    arguments: { entryId: "ID!", gameId: "ID!", selectedTeam: "String!" },
  },
  visibleSeasonPicks: { type: "Query", arguments: { seasonId: "ID!" } },
};

export const verifySecurePicksResolverContract = async (
  outputDir,
  projectRoot,
) => {
  const files = new Map();
  const resources = [];
  let modelSchema;
  const walk = async (directory) => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) {
        await walk(file);
        continue;
      }
      if (!/\.(json|vtl|graphql)$/.test(item.name)) continue;
      const content = await readFile(file, "utf8");
      files.set(item.name, content);
      if (item.name === "model-schema.graphql") modelSchema = parse(content);
      if (item.name.endsWith(".json")) {
        const template = JSON.parse(content);
        for (const [id, resource] of Object.entries(template.Resources || {}))
          resources.push({ id, ...resource });
      }
    }
  };
  await walk(outputDir);
  assert(
    modelSchema,
    "Missing Amplify model schema for custom operation audit",
  );
  const fields = modelSchema.definitions
    .filter((type) => ["Mutation", "Query"].includes(type.name?.value))
    .flatMap((type) =>
      (type.fields || []).map((field) => ({ type: type.name.value, field })),
    );
  const customFields = fields.filter(({ field }) =>
    field.directives.some((directive) => directive.name.value === "function"),
  );
  assert.deepEqual(
    customFields.map(({ field }) => field.name.value).sort(),
    [
      ...Object.keys(operations),
      "listPendingRegistrations",
      "approveRegistration",
    ].sort(),
    "Custom Lambda operation inventory changed: add a handler contract test before deployment",
  );

  const requestTemplate = (properties, direction = "Request") => {
    const inline = properties[`${direction}MappingTemplate`];
    if (typeof inline === "string") return inline;
    if (inline?.["Fn::Join"]) {
      const [separator, parts] = inline["Fn::Join"];
      return parts
        .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
        .join(separator);
    }
    const location = JSON.stringify(
      properties[`${direction}MappingTemplateS3Location`],
    );
    const hash = location.match(/[a-f0-9]{64}\.vtl/);
    assert(hash, `Cannot resolve synthesized VTL asset: ${location}`);
    const template = files.get(`asset.${hash[0]}`);
    assert(template, `Missing VTL asset ${hash[0]}`);
    return template;
  };
  const payloads = {};
  for (const [fieldName, operation, attributeExists] of [
    ["createPick", "PutItem", false],
    ["updatePick", "UpdateItem", true],
  ]) {
    const resolver = resources.find(
      (item) =>
        item.Type === "AWS::AppSync::Resolver" &&
        item.Properties.TypeName === "Mutation" &&
        item.Properties.FieldName === fieldName,
    );
    assert(resolver, `Missing generated ${fieldName} resolver`);
    const pipelineIds = resolver.Properties.PipelineConfig.Functions.map(
      (ref) => ref["Fn::GetAtt"]?.[0],
    );
    const dataFunction = resources.find(
      (item) =>
        pipelineIds.includes(item.id) &&
        item.Type === "AWS::AppSync::FunctionConfiguration" &&
        item.id.includes("DataResolver"),
    );
    assert(dataFunction, `Missing generated ${fieldName} data function`);
    const request = requestTemplate(dataFunction.Properties);
    assert(request.includes(`"operation": "${operation}"`));
    assert(
      request.includes(`"id": {\n      "attributeExists": ${attributeExists}`),
      `${fieldName} must keep its generated primary-key existence condition`,
    );
  }
  const entry = modelSchema.definitions.find(
    (type) => type.name?.value === "Entry",
  );
  const owner = entry.fields.find((field) => field.name.value === "owner");
  const ownerAuth = owner.directives.find(
    (directive) => directive.name.value === "auth",
  );
  const ownerRules = valueFromASTUntyped(
    ownerAuth.arguments.find((arg) => arg.name.value === "rules").value,
  );
  assert(
    ownerRules.some(
      (rule) =>
        rule.allow === "owner" &&
        rule.identityClaim === "sub" &&
        rule.operations.length === 1 &&
        rule.operations[0] === "read",
    ),
  );
  assert(
    ownerRules.every(
      (rule) =>
        rule.allow === "owner" ||
        (rule.allow === "groups" &&
          rule.groups.every((group) => group === "admin")),
    ),
    "Entry.owner must not gain broad player/public access",
  );
  const ownerResolver = resources.find(
    (resource) =>
      resource.Type === "AWS::AppSync::Resolver" &&
      resource.Properties.TypeName === "Entry" &&
      resource.Properties.FieldName === "owner",
  );
  assert(ownerResolver, "Missing generated Entry.owner field resolver");
  const ownerPipeline = ownerResolver.Properties.PipelineConfig.Functions.map(
    (reference) => reference["Fn::GetAtt"]?.[0],
  );
  const ownerFunction = resources.find(
    (resource) =>
      ownerPipeline.includes(resource.id) &&
      resource.Type === "AWS::AppSync::FunctionConfiguration",
  );
  assert(ownerFunction);
  const ownerTemplate = requestTemplate(ownerFunction.Properties);
  assert.match(ownerTemplate, /\$ctx\.source\.owner/);
  assert.match(ownerTemplate, /claims\.get\("sub"\)/);
  assert.match(ownerTemplate, /\$util\.unauthorized\(\)/);
  assert.doesNotMatch(ownerTemplate, /"entity":"player"/);
  const ownerResponse = requestTemplate(ownerFunction.Properties, "Response");
  assert.match(ownerResponse, /\$operation == "Mutation"/);
  assert.match(ownerResponse, /\$util\.toJson\(null\)/);
  console.log(
    "Verified generated Entry.owner owner/admin field authorization and model-mutation redaction.",
  );
  for (const [name, expected] of Object.entries(operations)) {
    const { field, type } = customFields.find(
      ({ field }) => field.name.value === name,
    );
    assert.equal(type, expected.type);
    assert.deepEqual(
      Object.fromEntries(
        field.arguments.map((arg) => [arg.name.value, print(arg.type)]),
      ),
      expected.arguments,
    );
    const auth = field.directives.find(
      (directive) => directive.name.value === "auth",
    );
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          valueFromASTUntyped(
            auth.arguments.find((arg) => arg.name.value === "rules").value,
          ),
        ),
      ),
      [{ allow: "groups", groups: ["player"] }],
      `${name} must retain player-only AppSync authorization`,
    );
    const functionName = valueFromASTUntyped(
      field.directives
        .find((directive) => directive.name.value === "function")
        .arguments.find((arg) => arg.name.value === "name").value,
    );
    const resolver = resources.find(
      (resource) =>
        resource.Type === "AWS::AppSync::Resolver" &&
        resource.Properties.FieldName === name,
    );
    assert(resolver, `Missing ${name} resolver`);
    const dispatch = requestTemplate(resolver.Properties);
    assert(dispatch.includes(`$ctx.stash.put("fieldName", "${name}")`));
    assert(dispatch.includes(`$ctx.stash.put("typeName", "${expected.type}")`));
    const invoke = resources.find(
      (resource) =>
        resource.Type === "AWS::AppSync::FunctionConfiguration" &&
        (resource.id.includes(functionName) ||
          JSON.stringify(resource.Properties.Name).includes(functionName)) &&
        requestTemplate(resource.Properties).includes('"Invoke"'),
    );
    assert(
      invoke,
      `Missing Lambda invocation function for ${name} (${functionName})`,
    );
    const pipelineIds = resolver.Properties.PipelineConfig.Functions.map(
      (reference) => reference["Fn::GetAtt"]?.[0],
    );
    assert(
      pipelineIds.includes(invoke.id),
      `${name} pipeline must call its own Lambda invocation function`,
    );
    const authStage = resources.find(
      (resource) =>
        pipelineIds.includes(resource.id) && resource.id !== invoke.id,
    );
    assert(authStage, `Missing ${name} authorization stage`);
    const authTemplate = requestTemplate(authStage.Properties);
    const staticRoles = authTemplate.match(
      /\$staticGroupRoles\s*=\s*(\[[^\n]*\])\s*\)/,
    );
    assert(staticRoles, `Missing ${name} static group authorization`);
    assert.deepEqual(JSON.parse(staticRoles[1]), [
      { claim: "cognito:groups", entity: "player" },
    ]);
    assert.match(authTemplate, /\$util\.unauthorized\(\)/);
    const payload = requestTemplate(invoke.Properties);
    assert.match(
      payload,
      /"fieldName"\s*:\s*\$util\.toJson\(\$ctx\.stash\.get\("fieldName"\)\)/,
    );
    assert.match(
      payload,
      /"arguments"\s*:\s*\$util\.toJson\(\$ctx\.arguments\)/,
    );
    assert.match(payload, /"identity"\s*:\s*\$util\.toJson\(\$ctx\.identity\)/);
    assert.doesNotMatch(payload, /"(?:info|action)"\s*:/);
    payloads[name] = payload;
    console.log(
      `Verified synthesized ${expected.type}.${name}: player group, arguments, flat Lambda payload.`,
    );
  }
  const replay = spawnSync(
    process.execPath,
    ["--test", "amplify/data/secure-picks/contract.test.mjs"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        SECURE_PICKS_REQUEST_TEMPLATES: JSON.stringify(payloads),
      },
    },
  );
  if (replay.error) throw replay.error;
  assert.equal(
    replay.status,
    0,
    "Secure-picks synthesized resolver/handler replay failed",
  );
};
