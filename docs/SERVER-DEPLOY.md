# Server deploy – Growth frontend staying up

The app is a **Next.js** app. It needs the **`.next`** folder (created by `npm run build`) to run with `npm run start`. If `.next` is missing or deleted, the frontend will stop working until you run `npm run build` again.

## Nothing in this repo deletes the build

Checked in this repo:

- **No scripts** run `rm -rf`, `clean`, or delete `.next` / `out` / `build`.
- **No lifecycle scripts** (postinstall, prebuild, etc.) remove build output.
- **Cron** (e.g. frequently-bought) only runs API/orchestrator logic and email – no filesystem cleanup.
- **Deploy script** `deploy_realtime_dashboard.sh` is for a different project (Real-Time Dashboard with backend/frontend). For this project use **`deploy_growth.sh`**.

So the “build folder gets deleted” behavior is almost certainly coming from **how the server or deploy is set up**, not from this codebase.

## Likely causes on the server

1. **Deploy that wipes the app dir**  
   e.g. `rm -rf *` then `git pull`, or deploy into a **new clone** and then only `npm start` without `npm run build`. After that, there is no `.next` (or it’s from an old clone).

2. **Wrong start command**  
   Using `npm run dev` instead of `npm run start`. Dev mode is not for production and can behave oddly under process managers.

3. **Cron or cleanup job on the host**  
   A system cron or “temp cleanup” job that deletes old files/dirs and ends up removing `.next` or the project directory.

4. **Disk / inode issues**  
   Full disk or inode exhaustion can make the system or app behave badly; worth checking `df` and `df -i`.

## What to do when you redeploy

1. **Use this repo’s deploy script**  
   On the server, from this project directory:
   ```bash
   bash deploy_growth.sh
   ```
   It pulls, installs, runs `npm run build`, then restarts the app (e.g. via PM2). It does **not** delete `.next` or the project dir.

2. **If you use your own deploy**  
   - Do **not** `rm -rf` the project directory or `.next` before/after `git pull`.
   - Do **not** clone into a fresh directory and then only run `npm start` without running `npm run build` in that directory.
   - Always run `npm run build` after updating code, then start with `npm run start` (or the standalone server; see below).

3. **PM2 (or similar)**  
   - Start command should be: `npm run start` (or `node .next/standalone/server.js` if you use standalone).
   - Working directory (cwd) must be the project root (where `package.json` and `.next` live).
   - Do not point PM2 at a path that gets recreated or cleaned by another script.

4. **Optional: standalone output**  
   This project has `output: 'standalone'` in `next.config.ts`. After `npm run build` you can run:
   ```bash
   cp -r public .next/standalone/
   cp -r .next/static .next/standalone/.next/
   PORT=3000 node .next/standalone/server.js
   ```
   You can copy the `.next/standalone` directory to another location and run from there; that way even if something else deletes the main project’s `.next`, you can still run the app from the copied standalone dir.

## Quick checklist after redeploy

- [ ] No deploy step deletes the project directory or `.next`.
- [ ] After every code update, `npm run build` is run in the project directory before starting the app.
- [ ] Process manager runs `npm run start` (or standalone `node .next/standalone/server.js`) with cwd = project root.
- [ ] No system cron or cleanup job is removing `.next` or the app directory.
- [ ] Disk space and inodes are sufficient (`df`, `df -i`).
