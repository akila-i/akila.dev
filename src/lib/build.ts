import { execSync } from 'node:child_process';

function gitSha(): string {
  const fromCi = process.env.GITHUB_SHA ?? process.env.WORKERS_CI_COMMIT_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

/** Facts about this build, shown in the footer. */
export const build = {
  sha: gitSha(),
  /** Fixed once per build so every page and endpoint agrees on "now". */
  now: Date.now(),
  get date(): string {
    return new Date(this.now).toISOString().slice(0, 10);
  },
};
