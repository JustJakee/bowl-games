import { existsSync } from "node:fs";
import { readFile, realpath, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import ts from "typescript";
import { compileProject } from "../node_modules/@aws-amplify/backend-deployer/lib/ts_compiler.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = path.join(projectRoot, ".amplify");
const outputDir = path.join(projectRoot, "tmp", "gen2-offline-synth");

// CI's CDK assembly loader did not resolve extensionless imports even though
// local Node 24 synthesis did. Check the source paths before using that loader.
const checkBackendImports = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkBackendImports(file);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const value = specifier.text;
      if (!/^\.\.?\//.test(value)) continue;
      const stem = value.replace(/\.(?:js|ts)$/, "");
      if (existsSync(path.resolve(directory, `${stem}.ts`)) && !value.endsWith(".ts")) {
        throw new Error(`${file}: local TypeScript import '${value}' must use an explicit .ts suffix for Amplify's CI assembly loader.`);
      }
    }
  }
};

// These Amplify/CDK internals are pinned by package-lock.json. There is no
// documented ampx command that synthesizes a Gen 2 backend without deployment.
if (existsSync(generatedDir) || existsSync(outputDir)) {
  throw new Error("Offline synthesis requires absent .amplify and tmp/gen2-offline-synth directories; existing files were left untouched.");
}

const previousCwd = process.cwd();
process.chdir(projectRoot);
process.env.AWS_EC2_METADATA_DISABLED = "true";
process.env.CDK_CONTEXT_JSON = JSON.stringify({
  "amplify-backend-namespace": "d1mqezo38x3xb8",
  "amplify-backend-name": "gen2-updates",
  "amplify-backend-type": "branch",
});
process.env.CDK_OUTDIR = outputDir;

const removeCreatedDirectory = async (target) => {
  if (!(await stat(target).catch(() => null))) return;
  const resolved = await realpath(target);
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`Refusing cleanup outside the project: ${resolved}`);
  }
  await rm(resolved, { recursive: true, force: true });
};

try {
  await checkBackendImports(path.join(projectRoot, "amplify"));
  await tsImport(pathToFileURL(path.join(projectRoot, "amplify", "backend.ts")).toString(), import.meta.url);
  process.emit("message", "amplifySynth");

  const manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8"));
  const generatedEnv = path.join(generatedDir, "generated", "env", "secure-picks.ts");
  const envSource = await readFile(generatedEnv, "utf8");
  const registrationEnv = await readFile(path.join(generatedDir, "generated", "env", "registration-admin.ts"), "utf8");
  const outputFiles = await readdir(outputDir);
  if (!Object.keys(manifest.artifacts || {}).length || !envSource.includes("process.env") || !registrationEnv.includes("AMPLIFY_AUTH_USERPOOL_ID") || outputFiles.length === 0) {
    throw new Error("Amplify synthesis did not produce the expected assembly and function environment modules.");
  }
  // Amplify's deployer runs this compiler after synthesis, when generated env types exist.
  compileProject(path.join(projectRoot, "amplify"));
  console.log("Amplify backend synthesized, Lambda bundled, and backend-local TypeScript validated.");
} finally {
  await removeCreatedDirectory(outputDir);
  await removeCreatedDirectory(generatedDir);
  process.chdir(previousCwd);
}
