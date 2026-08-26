import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: ".next-authenticated",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../../.."),
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/.next/**", "**/output/playwright/**"],
    };
    return config;
  },
};

export default nextConfig;
