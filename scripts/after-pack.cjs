// electron-builder never copies folders named "node_modules" into extraResources, but the desktop
// server needs its own. This copies them into the packaged app after the main packaging step.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const resources =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");
  const from = path.join(__dirname, "..", "desktop-server", "node_modules");
  const to = path.join(resources, "server", "node_modules");
  if (!fs.existsSync(from)) throw new Error(`Missing ${from}. Run "npm run desktop:build" first.`);
  fs.cpSync(from, to, { recursive: true, dereference: true });
  console.log(`  • copied server node_modules -> ${to}`);
};
