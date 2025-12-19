import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable slow optimizations for faster builds
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  // Disable image optimization during build
  images: {
    unoptimized: true,
  },
  // Faster builds
  experimental: {
    optimizePackageImports: [],
  },
  // Disable source maps for faster builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
