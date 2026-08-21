# CI/CD Completion — Design

## Problem

The repo has exactly one GitHub Actions workflow, `.github/workflows/Deploy to GitHub Pages.yaml`, triggered only on push to `main`. It builds with `npm ci` / `npm run build`, even though the repo's canonical package manager is pnpm — `package.json` declares `packageManager: pnpm@11.17.0...`, and `pnpm-lock.yaml` + `pnpm-workspace.yaml` are present and actively used for local installs.

The two lockfiles (`package-lock.json`, `pnpm-lock.yaml`) have already drifted out of sync once and broken CI: commit `0cb371b` documents `npm ci` refusing to install after a dependency was added with `pnpm`, patched by manually re-running `npm install` to resync `package-lock.json` rather than removing the redundant lockfile.

There is no validation on pull requests or feature branches (e.g. `feat/lab-framework-exp001`). A broken build, lint error, or type error is only discovered after it lands on `main`, at which point the deploy workflow fails (or worse, doesn't fail if the breakage is in the un-built `yueqiao` site variant, which the deploy workflow never touches).

## Goals

1. Single source of truth for dependency installs: pnpm only.
2. A PR/branch-level CI gate that catches lint, type, and build errors before merge — for both site variants (`willsleep`, `yueqiao`) built from this codebase via `NEXT_PUBLIC_SITE_NAME`.
3. Deterministic Node version in CI (not `latest`, which can shift silently between runs).
4. Keep the existing deploy behavior (build `willsleep` variant, publish to GitHub Pages under `willsleep.dev`) intact — this is a completion, not a redesign.

## Non-goals

- Deploying the `yueqiao` "coming soon" variant anywhere. It's out of scope; CI will only verify it still *builds*.
- Adding a test runner/framework — none exists in this repo today, and none was requested.
- Renaming or restructuring the existing deploy workflow's identity in the Actions UI beyond what's needed (kept as the same file, edited in place).

## Design

### 1. Canonicalize on pnpm

- Delete `package-lock.json` from the repo.
- In the deploy workflow, replace the `npm`-based setup with:
  - `pnpm/action-setup@v4` (no explicit `version:` — it reads `packageManager` from `package.json`, so bumping pnpm later doesn't require a workflow edit)
  - `actions/setup-node@v4` with `cache: pnpm` (must run *after* `pnpm/action-setup` so the cache action can find the `pnpm` binary)
  - `pnpm install --frozen-lockfile` in place of `npm ci`
  - `pnpm run build` in place of `npm run build`

### 2. New `.github/workflows/ci.yml`

Trigger: `pull_request` targeting `main` only.

`push` (for branches without an open PR yet) was considered and dropped: once a PR exists, `push` and `pull_request` both fire for the same commit — `push` uses `refs/heads/<branch>`, `pull_request` uses `refs/pull/<n>/merge`, so they land in different concurrency groups and don't dedupe, causing every PR commit to run `verify` twice. `pull_request` alone still gates every commit on a branch with an open PR (via `synchronize`); the only cost is no CI feedback before a PR is opened, which is fine — the deploy workflow already covers `main`, and opening a (draft) PR early is cheap if earlier feedback is wanted.

Concurrency: group by workflow + PR ref, `cancel-in-progress: true` — superseded pushes on the same PR cancel the stale run (unlike the deploy workflow, which intentionally keeps `cancel-in-progress: false` for Pages deployment safety).

Job `verify` (`ubuntu-latest`):
1. Checkout
2. `pnpm/action-setup@v4`
3. `actions/setup-node@v4`, pinned `node-version: 24`, `cache: pnpm`
4. `pnpm install --frozen-lockfile`
5. `pnpm run lint`
6. `pnpm run typecheck`
7. `pnpm run build:willsleep`
8. `pnpm run build:yueqiao`

No artifact upload — this workflow only validates, it doesn't publish anything. Steps 7 and 8 both write to `out/`; the second overwrites the first, which is fine since neither output is retained.

### 3. Pin Node version

Both workflows currently use `node-version: latest`. Replace with `node-version: 24` (current major) in both, so CI doesn't silently pick up a new Node major mid-project. Not adding a `package.json` `engines` field — out of scope, no one has asked for local-install version enforcement.

### 4. `package.json`

Add one script:
```json
"typecheck": "tsc --noEmit"
```
`next build` already type-checks by default (no `ignoreBuildErrors` set in `next.config.ts`), so this is a faster, earlier-failing, more clearly-labeled check that runs before the two full builds rather than a strictly new capability.

## File changes

- `package-lock.json` — deleted
- `package.json` — add `typecheck` script
- `.github/workflows/Deploy to GitHub Pages.yaml` — switch to pnpm, pin Node 24
- `.github/workflows/ci.yml` — new file

## Risks / open questions

- `pnpm/action-setup@v4` parses the `packageManager` field itself to pick a version (not via Corepack); if that ever fails, fall back to an explicit `version: 11` pin. Verify in the first CI run.
- `tsc --noEmit` runs before either `next build`, so it type-checks against source only, not against `next build`'s generated route types under `.next/types`. This is a weaker check than the build's own type checking, not a strictly equivalent faster version of it — the two `build:*` steps still catch anything the standalone typecheck misses, so nothing is unguarded, but the two aren't redundant in the way "faster, earlier version of the same check" implies.
- `allowBuilds: sharp: false / unrs-resolver: false` in `pnpm-workspace.yaml` blocks native build scripts for those packages during `pnpm install`. This already applies locally, so CI behavior should match — flagged only because a frozen-lockfile install in a clean CI container is the first place a missing native build would actually surface.
