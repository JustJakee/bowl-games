import assert from "node:assert/strict";
import test, { after, beforeEach } from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import * as cognito from "@aws-sdk/client-cognito-identity-provider";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "graphql";
import { customOpFactory } from "../../../node_modules/@aws-amplify/data-schema/dist/esm/runtime/internals/operations/custom.mjs";

// Bundle the actual production entrypoints, replacing only AWS/network boundaries.
// No generated env module, deployed backend, or real Cognito account is needed.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
await mkdir(path.join(root, "tmp"), { recursive: true });
const directory = await mkdtemp(path.join(root, "tmp", "registration-test-"));
after(async () => {
  delete globalThis.__registrationContract;
  await rm(directory, { recursive: true, force: true });
});
let send;
const dataClient = { queries: {}, mutations: {} };
globalThis.__registrationContract = {
  ...cognito,
  CognitoIdentityProviderClient: class { send(command) { return send(command); } },
  dataClient,
};
const boundaryPlugin = {
  name: "registration-test-boundaries",
  setup(builder) {
    builder.onResolve({ filter: /^@mui\// }, ({ path: specifier }) => ({ path: require.resolve(specifier), external: true }));
    builder.onResolve({ filter: /^\$amplify\/env\/registration-admin$/ }, () => ({ path: "env", namespace: "boundary" }));
    builder.onResolve({ filter: /^@aws-sdk\/client-cognito-identity-provider$/ }, () => ({ path: "sdk", namespace: "boundary" }));
    builder.onResolve({ filter: /auth\/amplifyConfig$/ }, () => ({ path: "client", namespace: "boundary" }));
    builder.onLoad({ filter: /.*/, namespace: "boundary" }, ({ path: name }) => ({ contents:
      name === "env" ? 'export const env = { AMPLIFY_AUTH_USERPOOL_ID: "test-pool" };' :
      name === "client" ? 'export const dataClient = globalThis.__registrationContract.dataClient;' :
      `export const { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand,
        AdminListGroupsForUserCommand, AdminAddUserToGroupCommand } = globalThis.__registrationContract;`,
    }));
  },
};
const bundle = async (entry, name) => {
  const outfile = path.join(directory, `${name}.mjs`);
  const result = await build({ entryPoints: [path.join(root, entry)], outfile,
    bundle: true, write: false, format: "esm", platform: "node", packages: "external",
    jsx: "automatic", plugins: [boundaryPlugin] });
  await writeFile(outfile, result.outputFiles[0].contents);
  return import(pathToFileURL(outfile).href);
};
const { handler } = await bundle("amplify/data/registration-admin/handler.js", "handler");
const repository = await bundle("src/data/registrationRepository.js", "repository");
const { RegistrationResults } = await bundle("src/pages/AdminRegistrationsPage.jsx", "page");

const admin = { sub: "admin-sub", claims: { "cognito:groups": ["admin"] } };
const attributes = [ { Name: "email", Value: "pending@example.com" }, { Name: "email_verified", Value: "true" } ];
const verified = { Username: "pending-sub", UserStatus: "CONFIRMED", Attributes: attributes, UserCreateDate: new Date("2026-11-02T12:00:00Z") };
const event = (fieldName, args = {}, identity = admin) => {
  const context = {
    typeName: fieldName === "approveRegistration" ? "Mutation" : "Query",
    fieldName, arguments: args, identity, source: null, request: { headers: {} }, prev: null,
  };
  if (!process.env.REGISTRATION_REQUEST_TEMPLATE) return context;
  // The generated template is a JSON object with toJson expressions. Substitute
  // only its known ctx/stash references; unexpected VTL fails JSON parsing.
  const rendered = process.env.REGISTRATION_REQUEST_TEMPLATE
    .replace(/^\s*##.*$/gm, "")
    .replace(/\$util\.toJson\(\$ctx\.stash\.get\("(typeName|fieldName)"\)\)/g,
      (_, key) => JSON.stringify(context[key]))
    .replace(/\$util\.toJson\(\$ctx\.(arguments|identity|source|request|prev)\)/g,
      (_, key) => JSON.stringify(context[key]));
  const request = JSON.parse(rendered);
  assert.equal(request.operation, "Invoke");
  assert.equal(request.payload.fieldName, fieldName);
  assert.deepEqual(request.payload.arguments, args);
  return request.payload;
};
let calls;
beforeEach(() => { calls = []; send = async (command) => { calls.push(command); throw new Error("Unexpected Cognito call"); }; });

test("actual handler lists verified unapproved users across ListUsers pages without approving anyone", async () => {
  send = async (command) => {
    calls.push(command);
    assert.equal(command.input.UserPoolId, "test-pool");
    if (command instanceof cognito.ListUsersCommand) return command.input.PaginationToken
      ? { Users: [{ ...verified, Username: "approved-sub" }] }
      : { Users: [verified, { ...verified, Username: "unverified", UserStatus: "UNCONFIRMED" }], PaginationToken: "page2" };
    if (command instanceof cognito.AdminListGroupsForUserCommand) return { Groups: command.input.Username === "approved-sub" ? [{ GroupName: "player" }] : [] };
    throw new Error("Listing must not mutate Cognito");
  };
  assert.deepEqual(await handler(event("listPendingRegistrations")), [
    { username: "pending-sub", email: "pending@example.com", createdAt: "2026-11-02T12:00:00.000Z" },
  ]);
  assert.equal(calls.filter((c) => c instanceof cognito.ListUsersCommand).length, 2);
  assert.equal(calls.some((c) => c instanceof cognito.AdminAddUserToGroupCommand), false);
});

test("actual handler accepts top-level fieldName and username; AdminGetUser UserAttributes grants only player", async () => {
  send = async (command) => {
    calls.push(command);
    if (command instanceof cognito.AdminGetUserCommand) return { UserStatus: "CONFIRMED", UserAttributes: attributes };
    if (command instanceof cognito.AdminListGroupsForUserCommand) return { Groups: [] };
    if (command instanceof cognito.AdminAddUserToGroupCommand) return {};
    throw new Error("Unexpected command");
  };
  assert.equal(await handler(event("approveRegistration", { username: "pending-sub", group: "admin" })), true);
  assert.deepEqual(calls.map((c) => c.input), [
    { UserPoolId: "test-pool", Username: "pending-sub" },
    { UserPoolId: "test-pool", Username: "pending-sub" },
    { UserPoolId: "test-pool", Username: "pending-sub", GroupName: "player" },
  ]);
});

test("both operations reject player/pending/anonymous identities before Cognito access", async () => {
  for (const identity of [{ groups: ["player"] }, { sub: "pending", claims: {} }, null]) {
    for (const field of ["listPendingRegistrations", "approveRegistration"]) {
      await assert.rejects(handler(event(field, { username: "pending-sub" }, identity)), /Administrator authorization/);
    }
  }
  assert.equal(calls.length, 0);
});

test("unsupported dispatch and missing username fail explicitly without Cognito mutations", async () => {
  await assert.rejects(handler(event("unknown")), /Unsupported registration operation/);
  await assert.rejects(handler({ identity: admin, info: { fieldName: "listPendingRegistrations" } }), /Unsupported registration operation/);
  await assert.rejects(handler(event("approveRegistration")), /valid registration identifier/);
  assert.equal(calls.length, 0);
});

test("actual handler refuses unverified accounts and admins, and does not re-add an approved player", async () => {
  for (const scenario of ["unverified", "admin", "player"]) {
    calls = [];
    send = async (command) => {
      calls.push(command);
      if (command instanceof cognito.AdminGetUserCommand) return { UserStatus: scenario === "unverified" ? "UNCONFIRMED" : "CONFIRMED", UserAttributes: attributes };
      if (command instanceof cognito.AdminListGroupsForUserCommand) return { Groups: [{ GroupName: scenario }] };
      throw new Error("Approval must not add another group");
    };
    const operation = handler(event("approveRegistration", { username: "pending-sub" }));
    if (scenario === "player") assert.equal(await operation, true);
    else await assert.rejects(operation, /verify its email|Administrator accounts/);
    assert.equal(calls.some((c) => c instanceof cognito.AdminAddUserToGroupCommand), false);
  }
});

// Exercise the installed Amplify GraphQL operation generator, not a hand-written
// frontend request. Offline synthesis separately checks these against the schema
// and actual generated VTL payload (see registration-resolver-contract.mjs).
const introspection = { nonModels: { PendingRegistration: { name: "PendingRegistration", fields: {
  username: { name: "username", type: "String", isArray: false, isRequired: true },
  email: { name: "email", type: "String", isArray: false, isRequired: true },
  createdAt: { name: "createdAt", type: "AWSDateTime", isArray: false },
} } } };
const definitions = {
  listPendingRegistrations: { name: "listPendingRegistrations", type: { nonModel: "PendingRegistration" }, isArray: true },
  approveRegistration: { name: "approveRegistration", type: "Boolean", isArray: false,
    arguments: { username: { name: "username", type: "String", isArray: false, isRequired: true } } },
};
test("frontend → Amplify-generated GraphQL → flat resolver event → real handler lists and approves", async () => {
  const requests = [];
  let approved = false;
  send = async (command) => {
    if (command instanceof cognito.ListUsersCommand) return { Users: [verified] };
    if (command instanceof cognito.AdminGetUserCommand) return { UserStatus: "CONFIRMED", UserAttributes: attributes };
    if (command instanceof cognito.AdminListGroupsForUserCommand) return { Groups: approved ? [{ GroupName: "player" }] : [] };
    if (command instanceof cognito.AdminAddUserToGroupCommand) {
      assert.equal(command.input.GroupName, "player"); approved = true; return {};
    }
    throw new Error("Unexpected Cognito command");
  };
  const graphqlClient = { graphql: async (request) => {
    requests.push(request);
    assert.equal(request.authMode, "userPool");
    const operation = parse(request.query).definitions[0];
    const field = operation.selectionSet.selections[0];
    const args = Object.fromEntries(field.arguments.map((arg) => [arg.name.value, request.variables[arg.value.name.value]]));
    const result = await handler(event(field.name.value, args));
    return { data: { [field.name.value]: result } };
  } };
  for (const [name, definition] of Object.entries(definitions)) {
    const type = name === "approveRegistration" ? "mutation" : "query";
    dataClient[type === "mutation" ? "mutations" : "queries"][name] = customOpFactory(
      graphqlClient, introspection, type, definition, false, () => ({}),
    );
  }
  assert.equal((await repository.listPendingRegistrations()).length, 1);
  assert.equal(approved, false);
  assert.equal(await repository.approveRegistration("pending-sub"), true);
  assert.deepEqual(await repository.listPendingRegistrations(), []);
  assert.deepEqual(requests[1].variables, { username: "pending-sub" });
  assert.match(requests[1].query, /approveRegistration\(username: \$username\)/);
  assert.equal(requests[1].query.includes("action"), false);
});

test("frontend preserves GraphQL errors and rejects an unconfirmed approval", async () => {
  dataClient.queries.listPendingRegistrations = async () => ({ data: null, errors: [{ message: "Cognito AccessDenied: ListUsers" }] });
  await assert.rejects(repository.listPendingRegistrations(), /Cognito AccessDenied: ListUsers/);
  dataClient.mutations.approveRegistration = async () => ({ data: null, errors: [{ message: "Not authorized" }] });
  await assert.rejects(repository.approveRegistration("pending-sub"), /Not authorized/);
  dataClient.mutations.approveRegistration = async () => ({ data: false });
  await assert.rejects(repository.approveRegistration("pending-sub"), /not confirmed/);
});

test("actual page result rendering distinguishes failure, loading, success-empty, and approvable rows", () => {
  const render = (props) => renderToStaticMarkup(React.createElement(RegistrationResults, {
    loading: false, error: "", pending: [], approving: "", onApprove: () => {}, ...props,
  }));
  assert.match(render({}), /No verified accounts are waiting/);
  assert.doesNotMatch(render({ error: "Unsupported registration operation." }), /No verified accounts are waiting/);
  assert.doesNotMatch(render({ loading: true }), /No verified accounts are waiting/);
  const row = render({ pending: [{ username: "pending-sub", email: "pending@example.com" }] });
  assert.match(row, /pending@example.com/);
  assert.match(row, /Approve player/);
  assert.doesNotMatch(row, /No verified accounts are waiting/);
});
