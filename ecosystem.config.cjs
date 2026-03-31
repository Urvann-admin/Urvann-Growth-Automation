/**
 * PM2: run from repo root on the server.
 *   pm2 start ecosystem.config.cjs
 * Prefer `next start` over standalone server.js so `/_next/static` always matches the current build
 * (avoids chunk 404s from stale copies or cached HTML after deploys).
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "growth-backend",
      cwd: __dirname,
      script: path.join(__dirname, "node_modules/next/dist/bin/next"),
      args: "start",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--max-old-space-size=1536",
      },
      max_memory_restart: "1536M",
    },
  ],
};
