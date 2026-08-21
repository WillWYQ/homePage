import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktree checkouts (gitignored, but not excluded from lint's own
    // file walk by default) — each is a full repo copy including its own
    // .next/out build output, so linting picks up duplicate/build-artifact
    // errors that have nothing to do with the primary tree.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
