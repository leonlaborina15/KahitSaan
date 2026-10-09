import type { NextConfig } from "next";

// Static export: no server, no API routes (AGENTS.md rule 2).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
