// Deploy gate, run by `bun run deploy` before anything is built or shipped.
// Refuses to deploy unless the tree is clean, on main, HEAD == origin/main,
// and lint + tests pass. Set DEPLOY_SKIP_CHECKS=1 to bypass (loudly).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

if (process.env.DEPLOY_SKIP_CHECKS === "1") {
  console.warn("\n!!! DEPLOY_SKIP_CHECKS=1: SKIPPING ALL PRE-DEPLOY CHECKS !!!");
  console.warn("!!! Deploying without verifying clean tree, main, pushed, lint, tests. !!!\n");
  process.exit(0);
}

const git = (...args) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
};

const problems = [];

// 0. Build-time env. PUBLIC_* values are baked into the bundle at build time;
// a deploy without the PostHog token silently ships the site with analytics
// (browser and server-side purchase events) switched off, which went
// unnoticed for a while. `mise run deploy` pulls it from Vault.
const dotenv = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const fromDotenv = dotenv.match(/^PUBLIC_POSTHOG_PROJECT_TOKEN=(.*)$/m)?.[1]?.trim();
const posthogToken = process.env.PUBLIC_POSTHOG_PROJECT_TOKEN || fromDotenv || "";
if (!posthogToken.startsWith("phc_")) {
  problems.push(
    "PUBLIC_POSTHOG_PROJECT_TOKEN is not set, so the build would ship with analytics off. " +
      "Deploy with `mise run deploy` (reads it from Vault secret/simic-systems/posthog).",
  );
}

// 1. Branch
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (!branch.ok) {
  problems.push(`Could not determine the current branch: ${branch.err}`);
} else if (branch.out !== "main") {
  problems.push(`On branch "${branch.out}", not main. Deploys ship from main only.`);
}

// 2. Clean tree (untracked included, gitignored files excluded)
const status = git("status", "--porcelain");
const statusRaw = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout ?? "";
if (!status.ok) {
  problems.push(`git status failed: ${status.err}`);
} else if (status.out) {
  const lines = statusRaw.trimEnd().split("\n");
  const shown = lines.slice(0, 15).map((l) => `    ${l}`).join("\n");
  const more = lines.length > 15 ? `\n    ... and ${lines.length - 15} more` : "";
  problems.push(`Working tree is not clean (commit or stash first):\n${shown}${more}`);
}

// 3. HEAD pushed: HEAD must equal origin/main after a fresh fetch
const fetch = git("fetch", "origin", "main");
if (!fetch.ok) {
  problems.push(`git fetch origin main failed, cannot verify HEAD is pushed: ${fetch.err}`);
} else {
  const head = git("rev-parse", "HEAD");
  const remote = git("rev-parse", "origin/main");
  if (head.ok && remote.ok && head.out !== remote.out) {
    const counts = git("rev-list", "--left-right", "--count", "HEAD...origin/main");
    const [ahead, behind] = counts.ok ? counts.out.split(/\s+/) : ["?", "?"];
    problems.push(
      `HEAD (${head.out.slice(0, 8)}) != origin/main (${remote.out.slice(0, 8)}): ` +
        `${ahead} commit(s) ahead (push them), ${behind} behind (pull them).`,
    );
  }
}

if (problems.length) {
  console.error("\nDeploy blocked:\n");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nFix the above, or bypass with DEPLOY_SKIP_CHECKS=1 (not recommended).\n");
  process.exit(1);
}

// 4. Lint + tests (only worth running once the git state is sound)
for (const script of ["lint", "test"]) {
  console.log(`> bun run ${script}`);
  const r = spawnSync("bun", ["run", script], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\nDeploy blocked: \`bun run ${script}\` failed.\n`);
    process.exit(1);
  }
}

console.log("Pre-deploy checks passed.");
