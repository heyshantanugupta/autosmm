import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  // The desktop app ships a small self-contained server. The website build is unchanged.
  ...(process.env.DESKTOP_BUILD === "1"
    ? {
        output: "standalone",
        // The app shows no photos, so Next's image tool (about 46 MB of native files) is left out.
        images: { unoptimized: true },
        outputFileTracingExcludes: { "*": ["node_modules/@img/**", "node_modules/sharp/**"] },
        // Pages are served from the same computer, so compressing them only costs processor time.
        compress: false,
      }
    : {}),
  poweredByHeader: false,
};

export default nextConfig;
