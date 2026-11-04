// Render the actual first-entry/error component without a browser or network.
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transform } from "esbuild";

const root = fileURLToPath(new URL("../../../", import.meta.url));
await mkdir(path.join(root, "tmp"), { recursive: true });
const directory = await mkdtemp(path.join(root, "tmp", "entry-start-render-"));
after(async () => {
  await rm(directory, { recursive: true, force: true });
});
const source = await readFile(
  path.join(root, "src/components/picks/EntryStartState.jsx"),
  "utf8",
);
const renderSource = source
  .replace(
    'import { Alert, Box, Button, Stack, Typography } from "@mui/material";',
    `import React from "react";
const Container = ({ children }) => React.createElement("div", null, children);
const Alert = ({ children, action }) => React.createElement("div", null, children, action);
const Box = Container;
const Button = ({ children, disabled }) => React.createElement("button", { disabled }, children);
const Stack = Container;
const Typography = Container;`,
  )
  .replace('import Panel from "../common/Panel";', "const Panel = Container;");
const built = await transform(renderSource, {
  loader: "jsx",
  format: "esm",
  jsx: "automatic",
});
const output = path.join(directory, "component.mjs");
await writeFile(output, built.code);
const { default: EntryStartState } = await import(pathToFileURL(output).href);
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(EntryStartState, {
      ready: true,
      gameCount: 48,
      onStart() {},
      onRetry() {},
      ...props,
    }),
  );

test("successful empty state renders one prominent action, game count, and no naming input", () => {
  const html = render({});
  assert.match(html, /Create Your Entry/);
  assert.match(html, /Start Making Picks/);
  assert.match(html.replace(/<[^>]*>/g, ""), /48 bowl games/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.doesNotMatch(html, /<input|Pick Set Name/);
});
test("loading is not treated as a successfully empty entry list", () => {
  const html = render({ ready: false });
  assert.match(html, /Loading your entry/);
  assert.doesNotMatch(html, /Start Making Picks|Create Your Entry/);
});
test("authorization failure has retry and never displays create-entry UI", () => {
  const html = render({
    error: "Not Authorized to access owner on type Entry",
  });
  assert.match(html, /Not Authorized/);
  assert.match(html, /Retry/);
  assert.doesNotMatch(html, /Start Making Picks|Create Your Entry/);
});
test("creation error is preserved and safe retry remains available", () => {
  const html = render({ createError: "The server rejected this request." });
  assert.match(html, /The server rejected this request/);
  assert.match(html, /Start Making Picks/);
});
test("in-flight creation disables the action and admin creation remains unavailable", () => {
  assert.match(render({ creating: true }), /disabled=""/);
  assert.doesNotMatch(render({ isAdmin: true }), /Start Making Picks/);
});
