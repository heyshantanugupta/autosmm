import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  // The desktop app ships a small self-contained server. The website build is unchanged.
  ...(process.env.DESKTOP_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
