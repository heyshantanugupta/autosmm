/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The desktop app ships a small self-contained server. The website build is unchanged.
  ...(process.env.DESKTOP_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
