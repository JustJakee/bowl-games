import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const branch = spawnSync("git -C .. branch --show-current", {
  cwd: projectRoot,
  shell: true,
  encoding: "utf8",
});
if (branch.error) throw branch.error;
if (branch.status !== 0 || branch.stdout.trim() !== "gen2-updates") {
  throw new Error(`Gen 2 preflight requires gen2-updates; found ${branch.stdout.trim() || "unknown"}.`);
}

// Keep each step separate so the first failure stops the preflight with its own exit code.
const steps = [
  ["Install pinned dependencies", "npm ci"],
  ["Automated tests", "npm test"],
  ["Root Amplify TypeScript check", "npm run amplify:typecheck"],
  ["Backend-local TypeScript check", "npx --no-install tsc --project amplify/tsconfig.json --noEmit"],
  ["Offline backend synthesis and Lambda bundling", "node scripts/preflight-gen2-synth.mjs"],
  ["Frontend production build", "npm run build"],
  ["Git whitespace check", "git -C .. diff --check"],
  ["Staged Git whitespace check", "git -C .. diff --cached --check"],
];

console.log(`Gen 2 preflight on Node ${process.version} in ${projectRoot}`);
for (const [label, command] of steps) {
  console.log(`\n[preflight] ${label}: ${command}`);
  const result = spawnSync(command, {
    cwd: projectRoot,
    shell: true,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[preflight] FAIL: ${label}`);
    process.exit(result.status || 1);
  }
  console.log(`[preflight] PASS: ${label}`);
}

console.log("\n[preflight] All local checks passed. AWS deployment remains unverified.");
