import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./vercel-production-db-push.mjs", import.meta.url));

test("schema writes are restricted to Vercel Production and failures stop the build", () => {
  const directory = mkdtempSync(join(tmpdir(), "spacecube-build-"));
  const fakeNpm = join(directory, "npm.cjs");
  writeFileSync(fakeNpm, 'console.log("FAKE_NPM:" + JSON.stringify(process.argv.slice(2))); process.exit(Number(process.env.FAKE_NPM_EXIT || 0));');
  try {
    const run = (vercelEnv, exit = "0", npmPath = fakeNpm) => {
      const env = { ...process.env, NODE_ENV: "production", FAKE_NPM_EXIT: exit, npm_execpath: npmPath };
      delete env.VERCEL_ENV;
      delete env.DATABASE_URL;
      if (vercelEnv !== undefined) env.VERCEL_ENV = vercelEnv;
      return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
    };
    for (const environment of ["preview", "development", undefined, "staging"]) {
      const result = run(environment);
      assert.ifError(result.error);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Skipped/);
      assert.doesNotMatch(result.stdout, /FAKE_NPM/);
    }
    const production = run("production");
    assert.ifError(production.error);
    assert.equal(production.status, 0);
    assert.match(production.stdout, /FAKE_NPM:\["run","db:push"\]/);
    assert.equal(run("production", "7").status, 7);
    assert.equal(run("production", "0", "").status, 1);
    assert.equal(run("production", "0", join(directory, "missing.cjs")).status, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
