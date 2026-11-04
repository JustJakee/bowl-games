import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const projectOutputsUrl = new URL("../../amplify_outputs.json", import.meta.url);
const publicOutputsUrl = new URL(
  "../../public/amplify_outputs.json",
  import.meta.url,
);

test("local Amplify outputs include the deployed optional favorite-team field", () => {
  const outputs = JSON.parse(readFileSync(projectOutputsUrl, "utf8"));
  const favoriteTeamField =
    outputs.data?.model_introspection?.models?.UserProfile?.fields
      ?.favoriteTeamId;

  assert.ok(outputs.auth?.user_pool_id);
  assert.ok(outputs.auth?.user_pool_client_id);
  assert.match(outputs.data?.url || "", /^https:\/\//);
  assert.ok(favoriteTeamField);
  assert.equal(favoriteTeamField.isRequired, false);
});

test("the runtime and public Amplify outputs stay synchronized", () => {
  const projectOutputs = readFileSync(projectOutputsUrl, "utf8");
  const publicOutputs = readFileSync(publicOutputsUrl, "utf8");
  const configSource = readFileSync(
    new URL("./amplifyConfig.js", import.meta.url),
    "utf8",
  );

  assert.equal(publicOutputs, projectOutputs);
  assert.match(configSource, /import outputs from "\.\.\/\.\.\/amplify_outputs\.json"/);
  assert.ok(
    configSource.indexOf("Amplify.configure(outputs)") <
      configSource.indexOf("generateClient()"),
  );
});
