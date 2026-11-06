import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RulesContent } from "./RulesPage.jsx";
import { formatRulesDeadline } from "../utils/rulesPresentation.js";

test("Rules page presents the fixed entry fee and effective lock with timezone", () => {
  const deadline = formatRulesDeadline(
    "2026-12-20T12:00:00Z",
    [{ kickoffAt: "2026-12-19T18:00:00Z" }],
  );
  assert.match(deadline, /December 19, 2026/);
  assert.match(deadline, /(?:GMT|[A-Z]{2,5})/);
  const markup = renderToStaticMarkup(<RulesContent deadline={deadline} summary={null} loading={false} error="" reload={() => {}} />);
  assert.match(markup, /Rules &amp; Prizes/);
  assert.match(markup, /\$5\.00 per player/);
  assert.match(markup, /Only confirmed paid entries contribute to the prize pool/);
  assert.match(markup, /Details coming soon/);
  assert.match(markup, /Deadline unavailable|December 19, 2026/);
  assert.equal(formatRulesDeadline(null, []), "Deadline unavailable");
});

test("zero paid entries and missing payout settings remain clear", () => {
  const markup = renderToStaticMarkup(<RulesContent
    deadline="Deadline unavailable"
    summary={{ confirmedPaidEntryCount: 0, prizePoolCents: 0, payoutConfigJson: null }}
    loading={false} error="" reload={() => {}}
  />);
  assert.match(markup, /Confirmed paid entries/);
  assert.match(markup, /\$0\.00/);
  assert.match(markup, /Prize distribution will be announced soon/);
});

test("configured current payout amounts appear without fabricated prizes", () => {
  const markup = renderToStaticMarkup(<RulesContent
    deadline="December 19, 2026 at 12:00 PM CST"
    summary={{ confirmedPaidEntryCount: 3, prizePoolCents: 1500,
      payoutConfigJson: JSON.stringify([
        { position: 1, percentageBasisPoints: 6000, label: "Champion" },
        { position: 2, percentageBasisPoints: 4000, label: "Runner up" },
      ]) }}
    loading={false} error="" reload={() => {}}
  />);
  assert.match(markup, /\$15\.00/);
  assert.match(markup, /Champion/);
  assert.match(markup, /60% of the pool/);
  assert.match(markup, /\$9\.00/);
  assert.match(markup, /\$6\.00/);
  assert.match(markup, /current amounts/);
});
