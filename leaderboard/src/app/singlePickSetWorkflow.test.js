import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("Picks page has one creation path and no entry selector or URL selection", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");

  assert.match(source, /Create Your Pick Set/);
  assert.doesNotMatch(source, /useSearchParams/);
  assert.doesNotMatch(source, /<Select/);
  assert.doesNotMatch(source, /New Entry/);
});

test("player pick-set management exposes no deletion workflow", () => {
  const source = readSource("../pages/EntriesPage.jsx");

  assert.match(source, /My Pick Set/);
  assert.doesNotMatch(source, /deleteSeasonEntry/);
  assert.doesNotMatch(source, /Delete Entry/);
  assert.doesNotMatch(source, /Dialog/);
});

test("shared player state resolves canonical data and keeps admin creation blocked", () => {
  const source = readSource("./AppDataContext.jsx");

  assert.match(source, /getCanonicalEntryForUser/);
  assert.match(source, /createOrLoadEntry/);
  assert.match(source, /runSingleFlight/);
  assert.match(source, /Admin accounts cannot create entries/);
  assert.match(source, /LEGACY_ACTIVE_ENTRY_STORAGE_PREFIX/);
  assert.doesNotMatch(source, /deleteSeasonEntry/);
});

test("dashboard and navigation use only singular pick-set terminology", () => {
  const dashboard = readSource("../pages/DashboardPage.jsx");
  const navigation = [
    readSource("../layout/AppShell.jsx"),
    readSource("../layout/DesktopSidebar.jsx"),
    readSource("../layout/DesktopNavigation.jsx"),
  ].join("\n");

  assert.match(dashboard, /currentEntry \? \[currentEntry\] : \[\]/);
  assert.doesNotMatch(navigation, /My Entries/);
  assert.match(navigation, /My Pick Set/);
});

test("Picks bulk actions use MUI confirmation and duplicate-operation guards", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");
  const actions = readSource("../components/picks/pickActions.js");

  assert.match(actions, /Randomize All Picks/);
  assert.match(actions, /Randomize Remaining Picks/);
  assert.match(source, /Clear All Picks/);
  assert.match(source, /<Dialog/);
  assert.match(source, /Clear all picks\?/);
  assert.match(source, /bulkOperationRef\.current/);
  assert.match(source, /queueCurrentPicksSave/);
  assert.doesNotMatch(source, /window\.confirm/);
});

test("individual team clicks use toggle semantics and the authorized clear update", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");
  const repository = readSource("../data/picksRepository.js");

  assert.match(source, /toggleGameSelection/);
  assert.match(repository, /client\.models\.Pick\.update/);
  assert.match(repository, /selectedTeam:\s*["']{2}/);
  assert.doesNotMatch(repository, /client\.models\.Pick\.delete/);
});
