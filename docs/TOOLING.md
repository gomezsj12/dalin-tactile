# Tooling & Agent DX — @dalin/tactile

MCP servers, CLIs, npm scripts, and gates that make agents (Claude Code, Cursor,
GPT) effective in this repo. Set up by the 2026-06-27 review — see
[`reviews/2026-06-27-initial-comprehensive-review.md`](./reviews/2026-06-27-initial-comprehensive-review.md).

## npm scripts (the gates)

```bash
npm run build         # tsc → dist/ (typecheck + emit). Run after every src/ change.
npm test              # vitest run (unit — currently pattern.ts only)
npm run test:watch    # vitest watch
npm run lint          # eslint src/ (flat config)
npm run lint:fix      # eslint --fix
npm run format        # prettier --write (see note below — do NOT bulk-reformat src yet)
npm run format:check  # prettier --check src/ (advisory — source is hand-formatted)
npm run size          # gzipped bundle-size budget per entry point (build first)
npm run demo          # build + serve demo/ at http://localhost:8137
```

**Verification bundle after any change:** `npm run build && npm test && npm run lint && npm run size`.

> **Prettier note:** the source predates Prettier and is hand-formatted, so
> `format:check` reports drift and CI runs it **advisory** (non-blocking). Adopting
> Prettier means a one-time `npm run format` reformat in its own owner-approved
> commit; after that, flip the CI step to a hard gate. Until then, don't run
> `npm run format` on `src/` as part of an unrelated change — it produces a large,
> noisy diff. (Tracked: `code-audit.md` AUDIT for Prettier adoption.)

## CI (`.github/workflows/ci.yml`)

Runs on push to `main` and every PR: `npm ci` → build → **`dist/` drift guard**
(rebuilds and fails if committed `dist/` differs) → test → lint → size budget →
format-check (advisory). The drift guard exists because `dist/` is committed and is
what GitHub installs pull (see [`STACK_DECISIONS.md`](./STACK_DECISIONS.md)).

## MCP servers

### fallow (codebase intelligence)

The dalin family uses **fallow** for dead-code / duplication / complexity / taint
analysis and clone tracing. It ships as a project-scoped server in [`.mcp.json`](../.mcp.json):

```json
{
  "mcpServers": {
    "fallow": {
      "command": "npx",
      "args": ["-y", "fallow-mcp"]
    }
  }
}
```

Claude Code / Cursor pick up project-scoped `.mcp.json` automatically (a client may
prompt once to approve the server on first use). Useful tools
here: `analyze` (full pass), `find_dupes` (the divergent `navigator.vibrate` helpers
across siblings this library is meant to collapse), `check_health` (complexity — the
particle engine is the hotspot), `trace_export` / `trace_file` (the `dist/` ↔ `src/`
and `tactile-site` vendored-copy graph).

## CLIs worth having

- **Node ≥ 20** — matches CI; the build, tests, demo server, and `scripts/check-size.mjs`
  all run on plain Node (no global CLI needed).
- **gh** (GitHub CLI) — releases/PRs; the package installs via `github:gomezsj12/dalin-tactile`,
  so tags/releases matter once consumers pin versions.

## Recommended additions (not yet present)

- **Browser / e2e harness** (Playwright) — the channels are browser-side-effect-heavy
  and unit tests can't exercise them. A real Chromium with a `navigator.vibrate` spy +
  an `AudioContext` assertion would catch firing/coordination regressions. See
  [`DEFERRED.md`](./DEFERRED.md).
- **`dist/` drift guard for `tactile-site`** — the public demo vendors a byte copy of
  `dist/` at `src/lib/tactile/` with no sync step. Add a `sync:site` script (copy
  `dist/` → `../tactile-site/src/lib/tactile/`) or a CI check that compares them, so a
  release can't ship a stale demo. (Tracked in `code-audit.md`.)
- **Stricter ESLint tier** — the current config uses the non-type-checked `recommended`
  preset. A `recommendedTypeChecked` + `no-non-null-assertion` tier would flag the
  heavy `!` usage in `particles.ts`; adopt once the source is allowed to change.

## For Cursor / GPT / other agents

See the **Agent-specific guidance** section of [`CODE_REVIEW.md`](./CODE_REVIEW.md)
for the per-model rules (this is a zero-dep browser library, not a Next.js/DB app;
SSR-safety; the platform-reality constraints; committed `dist/`).
