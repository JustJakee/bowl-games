import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("Picks page has one creation path and no entry selector or URL selection", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");

  assert.match(source, /EntryStartState/);
  assert.doesNotMatch(
    source,
    /Pick Set Name|newPickSetName|buildDefaultPickSetName/,
  );
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

test("dashboard and navigation keep Picks as the only player pick destination", () => {
  const dashboard = readSource("../pages/DashboardPage.jsx");
  const navigation = [
    readSource("../layout/AppShell.jsx"),
    readSource("../layout/DesktopSidebar.jsx"),
    readSource("../layout/DesktopNavigation.jsx"),
  ].join("\n");

  assert.match(dashboard, /currentEntry \? \[currentEntry\] : \[\]/);
  assert.doesNotMatch(navigation, /My Entries/);
  assert.doesNotMatch(navigation, /My Pick Set/);
  assert.match(
    readSource("./AppRouter.jsx"),
    /path="\/entries" element={<Navigate to="\/picks" replace/,
  );
});

test("Picks bulk actions use MUI confirmation and duplicate-operation guards", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");
  const actions = readSource("../components/picks/pickActions.js");
  const overlay = readSource("../components/picks/PickActionOverlay.jsx");

  assert.match(actions, /Randomize All Picks/);
  assert.match(actions, /Randomize Remaining Picks/);
  assert.match(source, />\s*Clear All\s*<\/Button>/);
  assert.match(source, /<Dialog/);
  assert.match(source, /Clear all picks\?/);
  assert.match(source, /Clearing your picks\.\.\./);
  assert.match(source, /clearProgress\.completed/);
  assert.match(source, /clearProgress\.percentage/);
  assert.match(source, /<LinearProgress/);
  assert.match(source, /bulkOperationRef\.current/);
  assert.match(source, /randomizeOperationRef\.current/);
  assert.match(source, /queueCurrentPicksSave/);
  assert.match(source, /aria-busy=\{randomizeFeedback\.isProcessing\}/);
  assert.match(source, /open=\{randomizeFeedback\.isProcessing\}/);
  assert.match(overlay, /role="status"/);
  assert.match(source, /disabled=\{gameLocked\}/);
  assert.match(source, /disabled=\{picksLocked \|\| isBulkProcessing\}/);
  assert.doesNotMatch(source, /window\.confirm/);
});

test("Pick Set header uses live status, responsive controls, and a disabled filter flag", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");

  assert.match(source, /My \{currentSeasonYear\} Bowl Picks/);
  assert.match(source, /: "In Progress"/);
  assert.doesNotMatch(source, /PaymentStatusChip/);
  assert.doesNotMatch(source, />\s*My Pick Set\s*</);
  assert.match(source, /\{progressCountLabel\}/);
  assert.match(source, /"picks completed"/);
  assert.match(source, /All picks saved/);
  assert.match(source, /Changes save automatically/);
  assert.match(source, /Saving picks\.\.\./);
  assert.match(source, /Unable to save picks/);
  assert.match(source, /Tiebreaker required — enter total points/);
  assert.match(source, /error=\{missingRequiredTieBreaker\}/);
  assert.match(source, /randomizePickSet/);
  assert.match(source, /nextTieBreakerValue: randomizedPickSet\.tieBreakerValue/);
  assert.match(source, /ShuffleRoundedIcon/);
  assert.match(source, /formatCompactPickLockMessage\(picksLockAt\)/);
  assert.match(source, /const ENABLE_PICK_FILTERS = false/);
  assert.match(source, /\{ENABLE_PICK_FILTERS \? \(/);
  assert.match(source, /setFilter\("all"\)/);
  assert.match(source, /setFilter\("incomplete"\)/);
  assert.match(source, /setFilter\("selected"\)/);
  assert.match(source, /jumpToIncomplete/);
});

test("Clear All dialog preserves confirmation controls and simplifies active progress", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");

  assert.match(source, /: "Clear all picks\?"/);
  assert.match(
    source,
    /This will remove all of your currently selected teams for unlocked\s+games\. This action cannot be undone\./,
  );
  assert.match(source, /bulkOperation !== "clear" \? \(/);
  assert.match(source, />Cancel<\/Button>/);
  assert.match(source, /: "Clear Picks"/);
  assert.equal(source.match(/Clearing your picks\.\.\./g)?.length, 1);
  assert.match(
    source,
    /\{clearProgress\.completed\} of \{clearProgress\.total\} picks\s+cleared/,
  );
  assert.match(
    source,
    /aria-valuetext=\{`\$\{clearProgress\.completed\} of \$\{clearProgress\.total\} picks cleared`\}/,
  );
  assert.doesNotMatch(source, /operations confirmed/);
  assert.match(source, /disabled=\{Boolean\(bulkOperation\)\}/);
  assert.match(source, /bulkOperation === "clear" \? "Clearing\.\.\."/);
});

test("individual team clicks use toggle semantics and the guarded save mutation", () => {
  const source = readSource("../components/picks/PicksWorkspace.jsx");
  const repository = readSource("../data/picksRepository.js");

  assert.match(source, /toggleGameSelection/);
  assert.match(repository, /client\.mutations\.saveSeasonPick/);
  assert.match(repository, /selectedTeam:\s*["']{2}/);
  assert.doesNotMatch(repository, /client\.models\.Pick\.delete/);
});
