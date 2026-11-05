import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LeaderboardMobileList from "./LeaderboardMobileList.jsx";
import LeaderboardPodium from "./LeaderboardPodium.jsx";
import LeaderboardTable from "./LeaderboardTable.jsx";
import {
  displayLeaderboardUsername,
  toLeaderboardEntries,
} from "./leaderboardViewModel.js";

const privateNames = [
  "first-picks@example.com",
  "Second Pick Set",
  "Third Pick Set",
  "Fourth Pick Set",
];
const rows = [
  {
    id: "one",
    rank: 1,
    username: "Big-Jake",
    entryName: privateNames[0],
    points: 20,
  },
  {
    id: "two",
    rank: 2,
    username: "BigDog",
    entryName: privateNames[1],
    points: 19,
  },
  {
    id: "three",
    rank: 3,
    username: "Test_Create_User",
    entryName: privateNames[2],
    points: 18,
  },
  { id: "four", rank: 4, username: "", entryName: privateNames[3], points: 17 },
];
const entries = toLeaderboardEntries(rows);
const displayEntries = entries.map((entry, index) => ({
  ...entry,
  entryName: privateNames[index],
}));

const assertPrivateNamesHidden = (markup) => {
  for (const name of privateNames)
    assert.doesNotMatch(markup, new RegExp(name));
};

test("public leaderboard rows retain canonical usernames and never map entry names", () => {
  assert.deepEqual(
    entries.map(({ username }) => username),
    ["Big-Jake", "BigDog", "Test_Create_User", "Player"],
  );
  assert.ok(entries.every((entry) => !("entryName" in entry)));
  assert.equal(
    toLeaderboardEntries([{ username: "private@example.com" }])[0].username,
    "Player",
  );
});

test("all three podium cards show only usernames with their scores and prizes", () => {
  const markup = renderToStaticMarkup(
    <LeaderboardPodium entries={displayEntries.slice(0, 3)} />,
  );
  for (const username of ["Big-Jake", "BigDog", "Test_Create_User"]) {
    assert.match(markup, new RegExp(username));
  }
  for (const [rank, username] of [
    [1, "Big-Jake"],
    [2, "BigDog"],
    [3, "Test_Create_User"],
  ]) {
    const card = markup.match(
      new RegExp(`podium-entry--rank-${rank}"[\\s\\S]*?<\\/article>`),
    )?.[0];
    assert.ok(card);
    assert.match(card, new RegExp(`<h2>${username}</h2>`));
  }
  assertPrivateNamesHidden(markup);
  assert.match(markup, /Correct Picks/);
  assert.match(markup, /Winnings/);

  const missingUsername = renderToStaticMarkup(
    <LeaderboardPodium
      entries={[{ ...displayEntries[0], username: "private@example.com" }]}
    />,
  );
  assert.match(missingUsername, /Player/);
  assert.doesNotMatch(missingUsername, /private@example.com/);
});

test("desktop and mobile ranking rows use neutral fallback without entry subtitles", () => {
  for (const isLive of [false, true]) {
    const table = renderToStaticMarkup(
      <LeaderboardTable
        entries={displayEntries}
        isLive={isLive}
        showFourthPrize
      />,
    );
    const mobile = renderToStaticMarkup(
      <LeaderboardMobileList
        entries={displayEntries}
        isLive={isLive}
        showFourthPrize
      />,
    );
    for (const markup of [table, mobile]) {
      assertPrivateNamesHidden(markup);
      assert.match(markup, /Big-Jake/);
      assert.match(markup, /Player/);
      assert.match(markup, /Test_Create_User/);
    }
    assert.doesNotMatch(table, />Picks<\/th>/);
    assert.doesNotMatch(mobile, /User &amp; Entry/);
    if (isLive) {
      assert.match(table, /Correct Picks/);
      assert.match(mobile, /Correct Picks/);
    }
  }
});

test("historical podium uses the same private-identity fallback", () => {
  const source = readFileSync(
    new URL("../../components/WinnersPodium.jsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /displayLeaderboardUsername\(winner.name\)/);
  assert.equal(displayLeaderboardUsername("private@example.com"), "Player");
  assert.equal(displayLeaderboardUsername("Jeff Gumm"), "Jeff Gumm");
});
