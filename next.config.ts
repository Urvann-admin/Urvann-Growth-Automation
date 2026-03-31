import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use default output for reliable deployment with `next start` (PM2: ecosystem.config.cjs).
  // Do not bundle these server-only packages; resolve at runtime.
  serverExternalPackages: ["mongodb", "mongoose"],
  // Avoid stale HTML after deploys (old pages referencing deleted chunk hashes → 404).
  // Long-cache only hashed assets under /_next/static; everything else revalidates.
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Disable image optimization during build to save time
  images: {
    unoptimized: true,
  },
  // Enable code splitting and optimize package imports
  experimental: {
    optimizePackageImports: ["@tanstack/react-table", "lucide-react", "react-select"],
  },
  // Disable source maps for faster builds and less memory usage
  productionBrowserSourceMaps: false,
  // TypeScript configuration
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false, // Keep false for safety, but can set to true for faster builds
  },
  // Configure Turbopack for better code splitting (Next.js 16 default)
  turbopack: {
    // Turbopack handles code splitting automatically and efficiently
  },
  // Fallback webpack config for explicit webpack usage (use --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize client-side bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
