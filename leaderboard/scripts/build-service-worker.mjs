import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const template = new URL("./service-worker.template.js", import.meta.url);
const cacheableExtensions = new Set([
  ".css", ".html", ".ico", ".js", ".png", ".svg", ".webp", ".woff", ".woff2",
]);

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const files = listFiles(dist)
  .filter((file) => {
    const name = file.split(/[\\/]/).at(-1);
    // The full-resolution source is retained for future icon generation, not app startup.
    if (["sw.js", "amplify_outputs.json", "bobs-bowl-games-icon.png"].includes(name)) return false;
    return name === "manifest.json" ||
      [...cacheableExtensions].some((extension) => name.endsWith(extension));
  })
  .sort();

const version = createHash("sha256");
for (const file of files) {
  version.update(relative(dist, file));
  version.update(readFileSync(file));
}

const urls = files.map((file) =>
  `/${relative(dist, file).replaceAll("\\", "/")}`,
);
for (const required of ["/index.html", "/offline.html", "/manifest.json"]) {
  if (!urls.includes(required)) {
    throw new Error(`Missing required PWA file in the production build: ${required}`);
  }
}
const worker = readFileSync(template, "utf8")
  .replace("__CACHE_VERSION__", version.digest("hex").slice(0, 16))
  .replace("__PRECACHE_URLS__", JSON.stringify(urls));

writeFileSync(new URL("../dist/sw.js", import.meta.url), worker);
console.log(`Prepared service worker with ${urls.length} app files.`);
