import type { NextConfig } from "next";

// Static export: no server, no API routes (AGENTS.md rule 2).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Fix for OneDrive symlink issues on Windows
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
