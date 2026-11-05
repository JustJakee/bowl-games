import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { SidebarNavButton } from "./DesktopSidebar.jsx";

const render = (notification) => renderToStaticMarkup(
  <MemoryRouter>
    <SidebarNavButton to="/more" label="Account" notification={notification} />
  </MemoryRouter>,
);

test("desktop Account link shows a compact notification only when requested", () => {
  const due = render(true);
  const clear = render(false);
  assert.match(due, /Account/);
  assert.match(due, /1 account notification/);
  assert.doesNotMatch(clear, /1 account notification/);
});
