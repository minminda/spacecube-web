import { spawnSync } from "node:child_process";

// Preserve the existing Vercel Production schema step. Preview and local
// builds only generate the client; schema changes use the explicit db:push command.
if (process.env.VERCEL_ENV !== "production") {
  console.log("[db:push] Skipped: this is not a Vercel Production build.");
  process.exit(0);
}

// npm supplies its CLI path when running lifecycle scripts. Using Node directly
// avoids platform-specific shell handling and runs the existing db:push command.
if (!process.env.npm_execpath) {
  console.error("[db:push] Run this Production build through npm run build.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "db:push"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) console.error("[db:push] Failed to start:", result.error.message);
process.exit(result.status ?? 1);
