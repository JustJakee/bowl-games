import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import DashboardHero from "../components/dashboard/DashboardHero.jsx";
import EntriesCard from "../components/dashboard/EntriesCard.jsx";
import PaymentDueBanner from "../components/dashboard/PaymentDueBanner.jsx";
import SeasonStatusPanel from "../components/dashboard/SeasonStatusPanel.jsx";
import { isDashboardPageLoading } from "../utils/pageReadiness.js";

const visibleText = (markup) =>
  markup
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/<!-- -->/g, "");

test("only unpaid shows the exact compact payment message", () => {
  const unpaid = visibleText(
    renderToStaticMarkup(<PaymentDueBanner paymentState="unpaid" />),
  );
  assert.match(
    unpaid,
    /Your picks are currently unpaid, please pay Jake or Bob Koons/,
  );
  for (const paymentState of ["paid", "none", "unavailable"]) {
    assert.equal(
      renderToStaticMarkup(<PaymentDueBanner paymentState={paymentState} />),
      "",
    );
  }
});

test("My Pick Set keeps game counts while the tiebreaker controls completion", () => {
  const base = {
    name: "Bowl Picks",
    contactEmail: "player@example.com",
    completedPicks: 2,
    totalPicks: 2,
  };
  const complete = visibleText(
    renderToStaticMarkup(<EntriesCard entry={{ ...base, isComplete: true }} />),
  );
  const incomplete = visibleText(
    renderToStaticMarkup(
      <EntriesCard
        entry={{ ...base, isComplete: false, needsTieBreaker: true }}
      />,
    ),
  );
  assert.match(complete, /My Pick Set\s*— Complete/);
  assert.match(incomplete, /My Pick Set\s*— Incomplete/);
  assert.match(incomplete, /2\s*\/\s*2/);
  assert.match(incomplete, /Add your tiebreaker/);
  assert.match(incomplete, /Bowl Picks/);
  assert.doesNotMatch(incomplete, /@/);
});

test("Dashboard hero hides only its leaderboard action before kickoff", () => {
  const render = (showLeaderboard) =>
    visibleText(
      renderToStaticMarkup(
        <StaticRouter location="/">
          <DashboardHero username="Player" showLeaderboard={showLeaderboard} />
        </StaticRouter>,
      ),
    );
  assert.match(render(false), /Go to My Picks/);
  assert.doesNotMatch(render(false), /View Full Leaderboard/);
  assert.match(render(true), /View Full Leaderboard/);
});

test("missing payment stays neutral in Season Status", () => {
  const markup = visibleText(
    renderToStaticMarkup(
      <StaticRouter location="/">
        <SeasonStatusPanel links={[]} picksLocked paymentState="unavailable" />
      </StaticRouter>,
    ),
  );
  assert.match(markup, /Payment status unavailable/);
  assert.doesNotMatch(markup, /Payment Due|Unpaid/);
});

test("Dashboard keeps B4 hydration gating and scopes leaderboard rows", () => {
  assert.equal(
    isDashboardPageLoading({
      seasonId: "test26-r2",
      entriesReady: true,
      currentEntryId: "entry-1",
      hydratedEntryId: "",
      picksLoading: true,
    }),
    true,
  );
  const source = readFileSync(
    new URL("./DashboardPage.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    source.indexOf('gridArea: "upcoming"') <
      source.indexOf('gridArea: "leaderboard"'),
  );
  assert.match(
    source,
    /showLeaderboard \? \(\s*<Box sx=\{\{ gridArea: "leaderboard"/,
  );
  assert.match(
    source,
    /leaderboardSeasonId === String\(currentSeasonId \|\| ""\)/,
  );
  assert.match(
    source,
    /<PageLoading loading message="Loading your dashboard\.\.\."/,
  );
});
