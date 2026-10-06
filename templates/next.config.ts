import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Self-contained server bundle for the Docker image (.next/standalone/server.js).
  output: "standalone",
  // PGlite ships WASM; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
