import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LeaderboardHeader from "./LeaderboardHeader.jsx";

test("Leaderboard header omits Picks Open while keeping season and live states", () => {
  const open = renderToStaticMarkup(
    <LeaderboardHeader isLive={false} picksLocked={false} seasonYear={2026} />,
  );
  assert.match(open, /Leaderboard/);
  assert.match(open, /Season 2026/);
  assert.doesNotMatch(open, /PICKS OPEN|leaderboard-status-chip/);

  const live = renderToStaticMarkup(
    <LeaderboardHeader isLive picksLocked seasonYear={2026} />,
  );
  assert.match(live, /LIVE/);
  assert.match(live, /Picks are locked/);

  const locked = renderToStaticMarkup(
    <LeaderboardHeader isLive={false} picksLocked seasonYear={2026} />,
  );
  assert.match(locked, /PICKS LOCKED/);
});
