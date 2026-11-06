import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import MobileBottomNavigation from "./MobileBottomNavigation.jsx";

const readSource = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const textContent = (markup) =>
  markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, "");

test("mobile bottom navigation selects Account at the existing settings route", () => {
  const markup = renderToStaticMarkup(
    <StaticRouter location="/more">
      <MobileBottomNavigation />
    </StaticRouter>,
  );
  const text = textContent(markup);
  for (const label of [
    "Dashboard",
    "Picks",
    "Games",
    "Leaderboard",
    "Account",
  ]) {
    assert.match(text, new RegExp(label));
  }
  assert.doesNotMatch(text, /More/);
  const accountIcon = markup.indexOf("PersonOutlineRoundedIcon");
  assert.ok(accountIcon > 0);
  const accountButton = markup.slice(
    markup.lastIndexOf("<button", accountIcon),
    accountIcon,
  );
  assert.match(accountButton, /Mui-selected/);

  const nav = readSource("./MobileBottomNavigation.jsx");
  const routes = readSource("../app/AppRouter.jsx");
  assert.match(nav, /value: "\/more", label: "Account"/);
  assert.match(nav, /navigate\(nextValue\)/);
  assert.match(routes, /path="\/more" element=\{<MorePage \/>\}/);
});

test("hamburger menus keep navigation and sign-out without showing email", () => {
  const player = readSource("./AppShell.jsx");
  const admin = readSource("./AdminLayout.jsx");
  assert.match(
    player,
    /<MobileHeader onOpenMenu=\{\(\) => setMenuOpen\(true\)\} \/>/,
  );
  const mainDestinations = ["/dashboard", "/leaderboard", "/picks", "/schedule"];
  for (const destination of mainDestinations) {
    assert.match(player, new RegExp(`to: "${destination}"`));
  }
  assert.match(player, /to: "\/rules"/);
  assert.match(player, /to: "\/install"/);
  assert.match(player, /to: "\/more"/);
  for (const destination of mainDestinations) {
    assert.ok(
      player.indexOf(`to: "${destination}"`) < player.indexOf('to: "/rules"'),
    );
  }
  assert.ok(player.indexOf('to: "/rules"') < player.indexOf('to: "/install"'));
  assert.ok(player.indexOf('to: "/install"') < player.indexOf('to: "/more"'));
  assert.match(player, /onClick=\{signOut\}/);
  assert.doesNotMatch(player.slice(player.indexOf("<Drawer")), /\{email\}/);
  const adminDrawer = admin.slice(admin.indexOf("<Drawer"));
  assert.match(adminDrawer, /to="\/admin\/account"/);
  assert.match(adminDrawer, /onClick=\{signOut\}/);
  assert.doesNotMatch(adminDrawer, /\{email\}/);
  assert.match(admin.slice(0, admin.indexOf("<Drawer")), /\{email\}/);
});

test("mobile header is fixed above the player page with space reserved for it", () => {
  const player = readSource("./AppShell.jsx");
  const admin = readSource("./AdminLayout.jsx");
  assert.match(player, /position: "fixed",\s*top: 0,\s*left: 0,\s*right: 0/);
  assert.match(player, /height: MOBILE_HEADER_HEIGHT/);
  assert.match(player, /aria-hidden="true" sx=\{\{ height: MOBILE_HEADER_HEIGHT \}\}/);
  assert.match(player, /zIndex: \(theme\) => theme\.zIndex\.appBar/);
  assert.match(player, /<MobileHeader onOpenMenu=/);
  assert.match(admin, /<AppBar\s+position="fixed"/);
  assert.match(admin, /aria-hidden="true" sx=\{\{ display: \{ xs: "block", md: "none" \}, height: 76 \}\}/);
});
