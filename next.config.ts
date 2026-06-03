import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['child_process', 'fs', 'path', 'crypto', 'os'],
  // No `images` config on purpose: the app renders thumbnails with plain <img>,
  // so the next/image optimizer stays disabled rather than acting as an open
  // proxy for arbitrary remote URLs.
};

export default nextConfig;
