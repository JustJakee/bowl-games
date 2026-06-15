const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "amplify_outputs.json");
const publicDir = path.join(projectRoot, "public");
const destinationPath = path.join(publicDir, "amplify_outputs.json");

if (!fs.existsSync(sourcePath)) {
  console.warn(
    "[sync-amplify-outputs] amplify_outputs.json not found at project root; skipping copy."
  );
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(sourcePath, destinationPath);
console.log(
  `[sync-amplify-outputs] Copied ${path.basename(sourcePath)} to public/.`
);
