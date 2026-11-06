import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const template = readFileSync(
  new URL("../service-worker.template.js", import.meta.url),
  "utf8",
)
  .replace("__CACHE_VERSION__", "test")
  .replace("__PRECACHE_URLS__", JSON.stringify(["/index.html", "/offline.html", "/assets/app.js"]));

const createWorker = ({ fetchResponse, cachedResponse }) => {
  const listeners = new Map();
  const cache = {
    match: async (request) => cachedResponse.get(typeof request === "string" ? request : new URL(request.url).pathname),
  };
  vm.runInNewContext(template, {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    caches: { open: async () => cache },
    fetch: fetchResponse,
    URL,
    Set,
    Response,
  });
  return listeners.get("fetch");
};

test("offline navigation loads the cached app shell", async () => {
  const onFetch = createWorker({
    fetchResponse: async () => { throw new Error("offline"); },
    cachedResponse: new Map([
      ["/index.html", new Response("app shell")],
      ["/offline.html", new Response("offline page")],
    ]),
  });
  let response;
  onFetch({
    request: { url: "https://example.test/dashboard", method: "GET", mode: "navigate" },
    respondWith: (promise) => { response = promise; },
  });
  assert.equal(await (await response).text(), "app shell");
});

test("offline page remains a fallback when the app shell was not cached", async () => {
  const onFetch = createWorker({
    fetchResponse: async () => { throw new Error("offline"); },
    cachedResponse: new Map([["/offline.html", new Response("offline page")]]),
  });
  let response;
  onFetch({
    request: { url: "https://example.test/picks", method: "GET", mode: "navigate" },
    respondWith: (promise) => { response = promise; },
  });
  assert.equal(await (await response).text(), "offline page");
});

test("only static app assets are served from the cache", async () => {
  const onFetch = createWorker({
    fetchResponse: async () => new Response("network"),
    cachedResponse: new Map([["/assets/app.js", new Response("cached script")]]),
  });
  let staticResponse;
  onFetch({
    request: { url: "https://example.test/assets/app.js", method: "GET", mode: "cors" },
    respondWith: (promise) => { staticResponse = promise; },
  });
  assert.equal(await (await staticResponse).text(), "cached script");

  for (const [url, method] of [
    ["https://example.test/graphql", "GET"],
    ["https://api.example.test/graphql", "GET"],
    ["https://example.test/graphql", "POST"],
  ]) {
    let intercepted = false;
    onFetch({
      request: { url, method, mode: "cors" },
      respondWith: () => { intercepted = true; },
    });
    assert.equal(intercepted, false);
  }
});
