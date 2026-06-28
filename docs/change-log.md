# Change log

What changed, when, and why. Most recent first.

## 2026-06-28 (AUDIT-014 override docs clarification)

- **AUDIT-014 fixed:** README Tuning now clarifies event override granularity: omitted
  channels keep their defaults, but a supplied channel recipe replaces that entire
  channel rather than deep-merging fields.

## 2026-06-28 (AUDIT-013 prefer-const cleanup)

- **AUDIT-013 fixed:** `src/motion/particles.ts` now keeps the shared mutable particle
  array behind a `const` binding, and ESLint `prefer-const` is back to an error.
- **Generated output rebuilt:** `dist/` refreshed from `src/` so GitHub installs stay in
  sync.

## 2026-06-27 (First comprehensive code review + review/docs system stood up)

- **Review + docs system created** (ported & fully re-tuned from `../notes-app` for a
  zero-dependency browser library): `docs/CODE_REVIEW.md` (8-phase process, 15
  library-specific anti-patterns, per-model agent guidance), `docs/code-audit.md` (the
  `AUDIT-NNN` catalogue + a "Verified sound" section), `docs/ARCHITECTURE.md`,
  `docs/STACK_DECISIONS.md`, `docs/DEFERRED.md`, `docs/error-log.md`, `docs/TOOLING.md`,
  `docs/README.md`, and `docs/reviews/2026-06-27-initial-comprehensive-review.md`.
- **Agent onboarding:** `AGENTS.md` (full guide + per-model guidance for Claude Code /
  Cursor Composer / GPT / Copilot) and `CLAUDE.md` (one-page quick reference) at the root.
- **Tooling applied:** ESLint (flat config) + Prettier; `package.json` scripts
  (`lint`, `lint:fix`, `format`, `format:check`, `size`); a GitHub Actions CI workflow
  (`build` + `dist/` drift guard + `test` + `lint` + `size` + advisory format-check); a
  gzipped bundle-size budget (`scripts/check-size.mjs`); a `/code-audit` slash command.
  The fallow MCP is documented as a paste-in `.mcp.json` snippet (the harness blocks an
  agent from auto-adding an MCP server).
- **Findings:** 19 catalogued — **0 Critical, 3 High, 3 Medium, 13 Low**.
  The `createTactile` lifecycle is the bug cluster (stale-async channel re-enable race,
  `set({events})` lost-update, no `dispose()`); the particle engine is the perf hotspot;
  security + SSR-safety verified sound. Produced by a multi-agent run with adversarial
  verification (80 candidates → 73 confirmed → 7 refuted).
- **Source:** review-only — **no library logic changed**. Additive `// AUDIT-NNN`
  locator comments at finding sites across 8 `src/` files; the two cross-repo doc
  references repointed to local docs (AUDIT-016). `dist/` rebuilt to stay in sync
  (verified comment-only). Gates green: build ✓, test 6/6 ✓, lint ✓ (1 tracked warning),
  size ✓.

## Earlier (from git history, pre-review)

- `169e01c` — feat(buzz): make buzz a continuous multi-second buzz across all channels
- `fa7280a` — feat: add buzz event, make it installable from GitHub, mirror the demo to the public site
- `147cb22` — feat: re-export the public type surface from the package root
- `b001981` — docs: add ROADMAP
- `09acf6f` — build: add prepare script so the package builds on install
- `8d0bb2b` — feat: initial release of @dalin/tactile
