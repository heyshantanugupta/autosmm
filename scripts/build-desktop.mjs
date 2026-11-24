// Builds the web app in "standalone" mode and gathers everything the desktop app needs in ./desktop-server.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const build = spawnSync(process.execPath, [nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DESKTOP_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const out = path.join(root, "desktop-server");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("The standalone server was not produced. Check next.config.mjs.");
  process.exit(1);
}
cpSync(standalone, out, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
console.log("Desktop server ready in desktop-server/");
