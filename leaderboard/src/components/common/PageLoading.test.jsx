import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import PageLoading, {
  DEFAULT_LOADING_DELAY_MS,
  DEFAULT_SLOW_AFTER_MS,
  PageLoadingView,
  schedulePageLoadingTimers,
} from "./PageLoading.jsx";

const createFakeTimers = () => {
  let now = 0;
  let nextId = 1;
  const timers = new Map();

  const setTimer = (callback, delay) => {
    const id = nextId++;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  const advance = (milliseconds) => {
    const target = now + milliseconds;
    while (true) {
      const pending = [...timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!pending) break;
      const [id, timer] = pending;
      timers.delete(id);
      now = timer.at;
      timer.callback();
    }
    now = target;
  };

  return { advance, clearTimer, pending: () => timers.size, setTimer };
};

const startTiming = (timers, events, options = {}) =>
  schedulePageLoadingTimers({
    ...options,
    clearTimer: timers.clearTimer,
    setTimer: timers.setTimer,
    onShow: () => events.push("show"),
    onSlow: () => events.push("slow"),
  });

test("spinner stays hidden until the configured delay", () => {
  const timers = createFakeTimers();
  const events = [];
  const cleanup = startTiming(timers, events);

  assert.equal(renderToStaticMarkup(<PageLoading loading />), "");
  timers.advance(DEFAULT_LOADING_DELAY_MS - 1);
  assert.deepEqual(events, []);
  timers.advance(1);
  assert.deepEqual(events, ["show"]);
  cleanup();
});

test("finishing before the delay prevents the spinner from appearing", () => {
  const timers = createFakeTimers();
  const events = [];
  const cleanup = startTiming(timers, events);

  timers.advance(100);
  cleanup();
  timers.advance(DEFAULT_SLOW_AFTER_MS);
  assert.deepEqual(events, []);
  assert.equal(timers.pending(), 0);
});

test("extended loading keeps the spinner and adds the slow message", () => {
  const timers = createFakeTimers();
  const events = [];
  const cleanup = startTiming(timers, events);

  timers.advance(DEFAULT_SLOW_AFTER_MS);
  assert.deepEqual(events, ["show", "show", "slow"]);
  const markup = renderToStaticMarkup(
    <PageLoadingView message="Loading games..." showSlowMessage />,
  );
  assert.match(markup, /CircularProgress/);
  assert.match(markup, /Loading games\.\.\./);
  assert.match(markup, /Still loading\. This is taking longer than expected\./);
  cleanup();
});

test("completion and unmount cleanup cancel every stale timer callback", () => {
  for (const elapsed of [0, DEFAULT_LOADING_DELAY_MS + 1]) {
    const timers = createFakeTimers();
    const events = [];
    const cleanup = startTiming(timers, events);
    timers.advance(elapsed);
    const eventCountAtCleanup = events.length;
    cleanup();
    timers.advance(DEFAULT_SLOW_AFTER_MS);
    assert.equal(events.length, eventCountAtCleanup);
    assert.equal(timers.pending(), 0);
  }

  assert.equal(renderToStaticMarkup(<PageLoading loading={false} />), "");
});

test("custom text and accessible status semantics render", () => {
  const markup = renderToStaticMarkup(
    <PageLoadingView
      message="Loading your dashboard..."
      showSlowMessage
      slowMessage="The dashboard is still loading."
    />,
  );

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /Loading your dashboard\.\.\./);
  assert.match(markup, /The dashboard is still loading\./);
});

test("custom timing values control both lifecycle thresholds", () => {
  const timers = createFakeTimers();
  const events = [];
  const cleanup = startTiming(timers, events, {
    delayMs: 25,
    slowAfterMs: 75,
  });

  timers.advance(24);
  assert.deepEqual(events, []);
  timers.advance(1);
  assert.deepEqual(events, ["show"]);
  timers.advance(50);
  assert.deepEqual(events, ["show", "show", "slow"]);
  cleanup();
});
