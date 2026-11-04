import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "graphql";

// Read the actual CDK assets produced by the installed Amplify transformer.
// Templates can be asset files or string properties inside CloudFormation JSON.
const collectTemplates = async (directory) => {
  const templates = [];
  const strings = (value) => {
    if (typeof value === "string") templates.push(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(strings);
  };
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) templates.push(...(await collectTemplates(file)));
    else if (/\.(json|vtl|graphql)$/.test(item.name)) {
      const content = await readFile(file, "utf8");
      if (item.name.endsWith(".json")) strings(JSON.parse(content));
      else templates.push(content);
    }
  }
  return templates;
};

export const verifyRegistrationResolverContract = async (
  outputDir,
  projectRoot,
) => {
  const templates = await collectTemplates(outputDir);
  const schema = templates.find(
    (template) =>
      /type Query\b/.test(template) &&
      /type Mutation\b/.test(template) &&
      template.includes("listPendingRegistrations"),
  );
  assert(schema, "Missing synthesized registration GraphQL schema");
  const definitions = parse(schema).definitions;
  for (const [typeName, fieldName] of [
    ["Query", "listPendingRegistrations"],
    ["Mutation", "approveRegistration"],
  ]) {
    const field = definitions
      .find((definition) => definition.name?.value === typeName)
      ?.fields?.find((item) => item.name.value === fieldName);
    assert(field, `Missing schema field ${typeName}.${fieldName}`);
    if (typeName === "Query") assert.equal(field.arguments.length, 0);
    else {
      assert.equal(field.arguments.length, 1);
      assert.equal(field.arguments[0].name.value, "username");
      assert.equal(field.arguments[0].type.kind, "NonNullType");
      assert.equal(field.arguments[0].type.type.name.value, "String");
    }
  }
  for (const [typeName, fieldName] of [
    ["Query", "listPendingRegistrations"],
    ["Mutation", "approveRegistration"],
  ]) {
    assert(
      templates.some(
        (template) =>
          template.includes(`$ctx.stash.put("fieldName", "${fieldName}")`) &&
          template.includes(`$ctx.stash.put("typeName", "${typeName}")`),
      ),
      `Missing generated ${typeName}.${fieldName} dispatch template`,
    );
  }
  const invoke = templates.find(
    (template) =>
      /"operation"\s*:\s*"Invoke"/.test(template) &&
      template.includes('$util.toJson($ctx.stash.get("fieldName"))'),
  );
  assert(invoke, "Missing Amplify Lambda request payload");
  assert.match(
    invoke,
    /"fieldName"\s*:\s*\$util\.toJson\(\$ctx\.stash\.get\("fieldName"\)\)/,
  );
  assert.match(invoke, /"arguments"\s*:\s*\$util\.toJson\(\$ctx\.arguments\)/);
  assert.match(invoke, /"identity"\s*:\s*\$util\.toJson\(\$ctx\.identity\)/);
  assert.doesNotMatch(invoke, /"(?:info|action)"\s*:/);

  // Replay the actual synthesized request template through the frontend/handler
  // tests, with only ctx values substituted. This catches template shape drift.
  const result = spawnSync(
    process.execPath,
    ["--test", "amplify/data/registration-admin/contract.test.mjs"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env, REGISTRATION_REQUEST_TEMPLATE: invoke },
    },
  );
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    "Synthesized registration resolver/handler regression failed",
  );
  console.log(
    "Synthesized registration dispatch and Lambda payload contract verified.",
  );
};
