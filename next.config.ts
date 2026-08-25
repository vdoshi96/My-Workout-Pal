import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/.playwright-cli/**", "**/output/playwright/**"],
    };
    return config;
  },
};

export default nextConfig;
