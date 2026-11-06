import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InstallPageView } from "./InstallPage.jsx";

const render = (props) => renderToStaticMarkup(
  <InstallPageView
    installed={false}
    canPrompt={false}
    promptInstall={() => {}}
    appleMobile={false}
    {...props}
  />,
);

test("install page offers a browser prompt when available", () => {
  const markup = render({ canPrompt: true });
  assert.match(markup, /Add to Home Screen/);
  assert.match(markup, /internet connection to sign in/);
});

test("install page explains manual iPhone installation and installed state", () => {
  assert.match(render({ appleMobile: true }), /Share button.*Add to Home Screen/);
  assert.match(render({ installed: true }), /using the installed app/);
  assert.doesNotMatch(render({ installed: true }), /Add to Home Screen/);
});
