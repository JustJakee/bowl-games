import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PickActionOverlay from "./PickActionOverlay.jsx";

test("pick action overlay is absent when the action is idle", () => {
  assert.equal(
    renderToStaticMarkup(
      <PickActionOverlay
        open={false}
        statusText="Randomizing picks..."
      />,
    ),
    "",
  );
});

test("pick action overlay announces randomizing and saving states", () => {
  const randomizing = renderToStaticMarkup(
    <PickActionOverlay
      open
      statusText="Randomizing picks..."
    />,
  );
  const saving = renderToStaticMarkup(
    <PickActionOverlay
      open
      statusText="Saving picks..."
    />,
  );

  assert.match(randomizing, /data-testid="pick-action-overlay"/);
  assert.match(randomizing, /role="status"/);
  assert.match(randomizing, /aria-live="polite"/);
  assert.match(randomizing, /football-rotation-sprites\.png/);
  assert.match(randomizing, /data-testid="rotating-football"/);
  assert.match(randomizing, /Randomizing picks\.\.\./);
  assert.match(saving, /Saving picks\.\.\./);
});

test("football sprite spins below the page heading and supports reduced motion", () => {
  const source = readFileSync(
    new URL("./PickActionOverlay.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /top: \{ xs: 62, md: 68 \}/);
  assert.doesNotMatch(source, /inset: 0/);
  assert.match(source, /transform: "rotate\(18deg\)"/);
  assert.match(source, /backgroundSize: "718\.7px 239\.6px"/);
  assert.match(source, /backgroundRepeat: "no-repeat"/);
  assert.equal(source.match(/background-position:/g)?.length, 8);
  assert.match(source, /12\.5% \{ background-position:/);
  assert.match(source, /87\.5% \{ background-position:/);
  assert.match(source, /1s steps\(1, end\) infinite/);
  assert.doesNotMatch(source, /infinite reverse/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(source, /rotateY|footballTurn|ease-in-out infinite/);
});
