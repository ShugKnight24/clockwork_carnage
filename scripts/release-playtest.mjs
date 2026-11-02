#!/usr/bin/env node
/**
 * Cut a playtest build: stamp src/build-info.js and package.json with the
 * next v<base>-playtest.N and the commit it is cut from, on its own branch.
 *
 *   npm run release:playtest              next N after the existing tags
 *   npm run release:playtest -- --n 3     a given N
 *
 * It commits on release/v<version> and stops there: push it, open a PR, and
 * tag the merge commit once it is on master (the command is printed).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const die = (msg) => {
  console.error(`release:playtest: ${msg}`);
  process.exit(1);
};

if (git("status", "--porcelain", "--untracked-files=no")) die("commit or stash your changes first.");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const base = pkg.version.replace(/-.*$/, "");
const nArg = process.argv.indexOf("--n");
const taken = git("tag", "--list", `v${base}-playtest.*`)
  .split("\n")
  .map((t) => Number(t.split(".").pop()))
  .filter(Number.isInteger);
const n = nArg > 0 ? Number(process.argv[nArg + 1]) : Math.max(0, ...taken) + 1;
if (!Number.isInteger(n) || n < 1) die("--n needs a positive whole number.");

const version = `${base}-playtest.${n}`;
const sha = git("rev-parse", "--short", "HEAD");
const date = new Date().toISOString().slice(0, 10);
const branch = `release/v${version}`;

git("switch", "-c", branch);
const info = "src/build-info.js";
const src = fs.readFileSync(info, "utf8").replace(
  /export const BUILD = \{[^}]*\};/,
  `export const BUILD = { version: "${version}", sha: "${sha}", date: "${date}" };`,
);
fs.writeFileSync(info, src);
pkg.version = version;
fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
git("add", info, "package.json");
git("commit", "-m", `chore(release): v${version}`);

console.log(`Committed v${version} (cut from ${sha}) on ${branch}.

Next:
  git push -u origin ${branch}
  gh pr create --base master --title "chore(release): v${version}"

After the PR is merged:
  git fetch origin && git tag v${version} origin/master && git push origin v${version}`);
