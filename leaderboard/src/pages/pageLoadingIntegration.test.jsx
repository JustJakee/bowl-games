import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LeaderboardCard from "../components/dashboard/LeaderboardCard.jsx";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("the four B4b destinations use shared page loading messages", () => {
  assert.match(
    readSource("./DashboardPage.jsx"),
    /<PageLoading loading message="Loading your dashboard\.\.\."/,
  );
  assert.match(
    readSource("./MorePage.jsx"),
    /<PageLoading loading message="Loading account\.\.\."/,
  );
  assert.match(
    readSource("../components/ScheduleView.jsx"),
    /<PageLoading loading message="Loading games\.\.\."/,
  );
  assert.match(
    readSource("./LeaderboardPage.jsx"),
    /<PageLoading loading message="Loading leaderboard\.\.\."/,
  );
});

test("dashboard leaderboard uses an inline state without blocking the page", () => {
  const loadingMarkup = renderToStaticMarkup(
    <LeaderboardCard rows={[]} loading />,
  );
  const emptyMarkup = renderToStaticMarkup(
    <LeaderboardCard rows={[]} loading={false} />,
  );
  const rowsMarkup = renderToStaticMarkup(
    <LeaderboardCard
      loading
      rows={[
        {
          rank: 1,
          username: "BowlFan",
          points: 12,
          record: "12-0",
        },
      ]}
    />,
  );

  assert.match(loadingMarkup, /Loading leaderboard\.\.\./);
  assert.doesNotMatch(loadingMarkup, /No standings yet/);
  assert.match(emptyMarkup, /No standings yet/);
  assert.match(rowsMarkup, /BowlFan/);
  assert.doesNotMatch(rowsMarkup, /Loading leaderboard/);

  const dashboardSource = readSource("./DashboardPage.jsx");
  assert.match(
    dashboardSource,
    /loading=\{!leaderboardIsCurrent && !leaderboardError\}/,
  );
});

test("dashboard surfaces scoped entry and pick errors instead of empty progress", () => {
  const source = readSource("./DashboardPage.jsx");
  assert.match(
    source,
    /const scopedDataError = entriesError \|\| \(currentEntry \? picksError : ""\)/,
  );
  assert.match(source, /<Alert severity="error">\{scopedDataError\}<\/Alert>/);
});

test("favorite-team loading remains supplemental on Account", () => {
  const source = readSource("./MorePage.jsx");
  const loadingReturn = source.indexOf("if (pageLoading)");
  const favoriteTeamGate = source.indexOf(
    "favoriteTeamLoading={teamsLoading && Boolean(favoriteTeamId)}",
  );

  assert.ok(loadingReturn >= 0);
  assert.ok(favoriteTeamGate > loadingReturn);
  assert.doesNotMatch(
    source.slice(0, loadingReturn),
    /pageLoading[\s\S]*teamsLoading/,
  );
});

test("Picks uses shared loading without treating persistence as page loading", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");
  assert.match(
    source,
    /<PageLoading loading message="Loading your picks\.\.\."/,
  );
  const readinessCall = source.slice(
    source.indexOf("const picksPageLoading = isPicksPageLoading"),
    source.indexOf("const blockSelectedEntryPickUi"),
  );
  assert.doesNotMatch(
    readinessCall,
    /saveState|bulkOperation|randomizePhase|tieBreakerValue/,
  );
  assert.match(source, /loadedDraftStorageKey/);
  assert.match(source, /reconciledDraftScope/);
  assert.match(source, /hydratedEntryId/);
});
