# CI/CD Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Canonicalize the repo on pnpm for CI, add a pull-request validation gate (lint + typecheck + build both site variants), and pin Node version — completing the CI/CD setup described in `docs/superpowers/specs/2026-08-21-cicd-completion-design.md`.

**Architecture:** Two GitHub Actions workflows: the existing `Deploy to GitHub Pages.yaml` (push-to-`main` → build willsleep variant → publish to Pages) edited to use pnpm instead of npm, and a new `ci.yml` (pull-request-to-`main` → lint, typecheck, build both variants, no publish). `package-lock.json` is deleted so pnpm's `pnpm-lock.yaml` is the only lockfile.

**Tech Stack:** GitHub Actions, pnpm 11 (via `pnpm/action-setup@v4`, version auto-detected from `package.json`'s `packageManager` field), Node 24, Next.js 16 static export, ESLint 9 flat config, TypeScript 6 (`tsc --noEmit`).

## Global Constraints

- Package manager is pnpm only — no `package-lock.json` in the repo (spec §1).
- CI workflows pin `node-version: "24"`, not `latest` (spec §3).
- `ci.yml` triggers on `pull_request` targeting `main` only — no `push` trigger, to avoid double-running `verify` on every PR commit (spec §2, review finding).
- `ci.yml` produces no deploy artifact; it only validates (spec, Non-goals).
- The `yueqiao` site variant is validated (`build:yueqiao` must succeed) but never deployed by any workflow (spec, Non-goals).
- Existing deploy behavior (build willsleep → publish to `willsleep.dev` via GitHub Pages) must keep working unchanged in outcome.

---

### Task 1: Canonicalize on pnpm — drop the npm lockfile, add the typecheck script

**Files:**
- Delete: `package-lock.json`
- Modify: `package.json`

**Interfaces:**
- Produces: a `typecheck` script (`tsc --noEmit`) that Task 3's `ci.yml` invokes as `pnpm run typecheck`.

- [x] **Step 1: Confirm the current lockfile drift risk exists**

Run: `git log --oneline -- package-lock.json | head -5`
Expected: shows past commits touching `package-lock.json` independently of `pnpm-lock.yaml` (e.g. `0cb371b`), confirming the two lockfiles have drifted before.

- [x] **Step 2: Delete the npm lockfile**

```bash
git rm package-lock.json
```

- [x] **Step 3: Add the `typecheck` script to `package.json`**

Edit the `scripts` block so it reads exactly:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "NEXT_PUBLIC_SITE_NAME=willsleep next build",
    "build:willsleep": "NEXT_PUBLIC_SITE_NAME=willsleep next build",
    "build:yueqiao": "NEXT_PUBLIC_SITE_NAME=yueqiao next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  }
}
```

(Only the `scripts` block changes — every other top-level field in `package.json` stays as-is.)

- [x] **Step 4: Verify pnpm still installs cleanly without the npm lockfile**

Run: `pnpm install --frozen-lockfile`
Expected: exits 0, no changes reported to `pnpm-lock.yaml` (if it tries to modify the lockfile, something in `package.json` doesn't match the lockfile — stop and investigate before continuing).

- [x] **Step 5: Verify the new script runs**

Run: `pnpm run typecheck`
Expected: exits 0 with no TypeScript errors (the codebase currently has none — if this fails, that's a pre-existing type error to report, not something this task should silently fix).

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: drop npm lockfile, add typecheck script

pnpm is already the repo's canonical package manager (packageManager
field, pnpm-lock.yaml, pnpm-workspace.yaml); the redundant
package-lock.json has drifted out of sync with it before (0cb371b)
and broken npm-based CI. One lockfile, one source of truth."
```

---

### Task 2: Switch the deploy workflow to pnpm and pin Node

**Files:**
- Modify: `.github/workflows/Deploy to GitHub Pages.yaml`

**Interfaces:**
- Consumes: `pnpm-lock.yaml` and the `packageManager` field from Task 1 (must exist and be internally consistent for `pnpm install --frozen-lockfile` to succeed).

- [x] **Step 1: Confirm current workflow still references npm**

Run: `grep -n "npm" ".github/workflows/Deploy to GitHub Pages.yaml"`
Expected: shows `cache: npm` and `run: npm ci` — the two lines this task replaces.

- [x] **Step 2: Replace the install/build steps with pnpm equivalents**

Replace the full file contents with:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build & Export static site
        run: pnpm run build

      - name: Add CNAME and .nojekyll
        run: |
          echo "willsleep.dev" > out/CNAME
          touch out/.nojekyll

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [x] **Step 3: Validate YAML syntax**

Run: `python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/Deploy to GitHub Pages.yaml'))" && echo OK`
Expected: prints `OK`. (If `python3`/`pyyaml` isn't available, instead run `pnpm dlx js-yaml ".github/workflows/Deploy to GitHub Pages.yaml" > /dev/null && echo OK`.)

- [x] **Step 4: Simulate the install+build steps locally**

Run: `pnpm install --frozen-lockfile && pnpm run build`
Expected: exits 0, `out/` directory is (re)created with a fresh static export.

- [x] **Step 5: Commit**

```bash
git add ".github/workflows/Deploy to GitHub Pages.yaml"
git commit -m "ci: switch deploy workflow from npm to pnpm, pin Node 24

Matches the repo's canonical package manager and removes the
npm-vs-pnpm lockfile drift risk that broke this workflow before.
node-version: latest replaced with a pinned major so CI doesn't
silently shift under a new Node release."
```

---

### Task 3: Add the pull-request CI gate (`ci.yml`)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `pnpm run lint`, `pnpm run typecheck` (from Task 1), `pnpm run build:willsleep`, `pnpm run build:yueqiao` (pre-existing scripts in `package.json`).

- [x] **Step 1: Confirm no CI currently runs on pull requests**

Run: `ls .github/workflows/`
Expected: only `Deploy to GitHub Pages.yaml` is listed — confirms there's no existing PR-triggered workflow to conflict with.

- [x] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [ "main" ]

concurrency:
  group: "ci-${{ github.event.pull_request.number }}"
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Typecheck
        run: pnpm run typecheck

      - name: Build willsleep variant
        run: pnpm run build:willsleep

      - name: Build yueqiao variant
        run: pnpm run build:yueqiao
```

- [x] **Step 3: Validate YAML syntax**

Run: `python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK`
Expected: prints `OK`.

- [x] **Step 4: Run every step of the new workflow locally, in order**

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build:willsleep
pnpm run build:yueqiao
```

Expected: every command exits 0. This is the same sequence `ci.yml` runs in CI — if any step fails locally, it will fail identically in Actions, so fix it here before committing (do not commit a `ci.yml` you haven't proven passes against the current tree).

- [x] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add pull-request gate — lint, typecheck, build both site variants

No prior validation ran on PRs or feature branches; breakage was only
caught after landing on main. Builds both NEXT_PUBLIC_SITE_NAME
variants (willsleep, yueqiao) since either can break independently.
Triggers on pull_request only (not push) to avoid double-running on
every PR commit — push and pull_request land in different
concurrency groups and wouldn't dedupe."
```

---

### Task 4: Final end-to-end verification

**Files:** none (verification only)

- [x] **Step 1: Confirm the working tree matches what was committed**

Run: `git status`
Expected: clean (nothing to commit) — Tasks 1–3 each committed their own changes.

- [x] **Step 2: Confirm only one lockfile remains**

Run: `git ls-files | grep -i lock`
Expected: only `pnpm-lock.yaml` (no `package-lock.json`).

- [x] **Step 3: Confirm both workflow files are valid and reference pnpm, not npm**

Run: `grep -rn "npm " .github/workflows/ || echo "no bare npm references"`
Expected: `no bare npm references` (both workflows use `pnpm`; this also catches any leftover `npm ci`/`npm run`).

- [x] **Step 4: Re-run the full local sequence one more time from a clean state**

```bash
rm -rf .next out
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build:willsleep
pnpm run build:yueqiao
```

Expected: every command exits 0, `out/` exists and contains `index.html` at the end.

- [x] **Step 5: Report status**

No commit in this task — it's pure verification of Tasks 1–3's commits. If everything above passed, the plan is complete: report to the user which commits were made and that the local dry run matches what `ci.yml` and the deploy workflow will run in GitHub Actions. Actual confirmation that GitHub Actions runs the workflows correctly requires pushing/opening a PR, which is outside this plan's scope (push/PR creation is the user's call).
