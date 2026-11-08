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
    // Design reference prototype (not imported anywhere in the build):
    "design/**",
    // Claude Code local state — gitignored (.gitignore:57), never built, and
    // holds full worktree COPIES of this repo under .claude/worktrees/*.
    // Without this, a bare `eslint` (i.e. `npm run check`) lints every sibling
    // worktree as well as the real tree: 178 extra files, 1494 errors, none of
    // them in anything that ships. Note "design/**" above does NOT cover the
    // copies — the pattern is anchored at the root, so .claude/worktrees/*/design
    // was being linted too.
    ".claude/**",
  ]),
]);

export default eslintConfig;
