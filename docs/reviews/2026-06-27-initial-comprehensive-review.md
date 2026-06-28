# Review session — 2026-06-27 · Initial comprehensive review

> The **first code review** of `@dalin/tactile`, and the run that **stood up the review
> system itself**. Doubles as the audit-run summary for this session (see also the
> root-level [`AUDIT-RUN-2026-06-27.md`](../../AUDIT-RUN-2026-06-27.md)).

## Reviewer
Claude Code (Opus 4.8), driving a multi-agent verification workflow: **5 dimension
finders** (correctness/lifecycle, performance, API/types, security/SSR, build/tooling/docs)
+ a **completeness critic**, with **every candidate finding adversarially verified** by an
independent skeptic instructed to refute it. 86 agents total, ~2.9M subagent tokens.

## Requested by
Repository owner (`gomezsj12`) — "act as a code reviewer; rework the sibling
`CODE_REVIEW` into one for this codebase; perform a full comprehensive review; stand up a
local documentation process; add useful comments; recommend tooling and apply it; leave
guidance for GPT/Cursor agents. **Do not change any (library) code.**"

## Scope
Whole codebase — all 15 `src/` files (~900 LOC), the demo (`demo/index.html`,
`demo/server.mjs`), build config (`tsconfig.json`, `package.json`, `.gitattributes`),
and the relationship to the `tactile-site` vendored copy. Covered: the `createTactile`
state machine + channel lifecycle, the haptic/PWM/iOS-switch mechanics, the Web Audio
synth/sample packs, the canvas particle engine, SSR-safety, the public type surface, and
packaging/tooling.

## Work done this run

**Stood up the review + docs system (new files):**

| File | Purpose |
|------|---------|
| `docs/CODE_REVIEW.md` | Reworked from `../notes-app/docs/CODE_REVIEW.md`, **fully re-tuned** for a zero-dep browser library — 8-phase process, 15 library-specific anti-patterns, per-model agent guidance |
| `docs/code-audit.md` | The `AUDIT-NNN` catalogue (19 findings) + an 8-item "Verified sound" section |
| `docs/ARCHITECTURE.md` | Channel model, backend swap seam, instance lifecycle, file map, entry points, SSR model |
| `docs/STACK_DECISIONS.md` | Why zero-dep / `tsc`-only / committed `dist/` / Capacitor-shaped, and what was rejected |
| `docs/DEFERRED.md` | npm publish, native backend, `dispose()`, React hook, e2e — scoped-out work |
| `docs/error-log.md` | `ERR-NNN` template + 4 backfilled lessons (the iOS audio-unlock + iOS-26.5 + buzz history) |
| `docs/TOOLING.md` | npm gates, CI, the fallow MCP (paste-in), recommended additions |
| `docs/change-log.md` | Dated history; this run logged |
| `docs/README.md` | Docs index, "how docs stay current", naming conventions, new-agent read order |
| `AGENTS.md` (root) | Full agent guide: critical warnings, before/while/after rules, **per-model guidance (Claude / Cursor / GPT / Copilot)**, git hygiene, key-files table |
| `CLAUDE.md` (root) | One-page Claude Code quick reference (points to `AGENTS.md`) |
| `AUDIT-RUN-2026-06-27.md` (root) | Human-readable audit-run summary |

**Tooling / DX (applied this run):**
- **ESLint** (flat config, `eslint.config.js`) + **Prettier** (`.prettierrc.json`, `.prettierignore`) added; `package.json` scripts `lint` / `lint:fix` / `format` / `format:check` / `size`; devDeps installed.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — build, **`dist/` drift guard**, test, lint, size budget, advisory format-check.
- **Bundle-size budget** (`scripts/check-size.mjs`) — gzipped per-entry-point gate.
- **`/code-audit` slash command** (`.claude/commands/code-audit.md`).
- **fallow MCP** — documented as a paste-in `.mcp.json` snippet in `TOOLING.md` (the harness blocks an agent from auto-adding an MCP server; left for the owner to enable).

**Source annotations (additive `// AUDIT-NNN` comments — ZERO logic changes):**
`src/index.ts`, `src/types.ts`, `src/presets.ts`, `src/pattern.ts`, `src/backends/web.ts`,
`src/ios-switch.ts`, `src/sound/synth.ts`, `src/motion/particles.ts`. The two cross-repo
doc references (AUDIT-016) were repointed to local docs in place. `dist/` was rebuilt so
it stays in sync (verified: **0 non-comment changed lines** across all `dist/*.js`).

## Findings summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 3 | AUDIT-001 (stale-async channel re-enable race), AUDIT-002 (`set({events})` drops prior overrides), AUDIT-003 (no `dispose()` — listener/AudioContext leak) |
| Medium | 3 | AUDIT-004 (iOS buzz = single tick vs "continuous" claim), AUDIT-005 (uncancelable shower timers at stale coords), AUDIT-006 (O(n²) particle collisions) |
| Low | 13 | AUDIT-007 (whole-burst drop), 008 (synth clip risk), 009 (backend type/doc drift), 010 (`test()` gap), 011 (PWM expansion), 012 (per-frame emoji lookup), 013 (`prefer-const`), 014 (override granularity vs README), 015 (tactile-site dist drift), 016 (cross-repo doc refs), 017 (Prettier adoption), 018 (`play(0)` cancels in-flight), 019 (synth node lifecycle — acceptable) |
| **Total** | **19** | |

**Refuted by the adversarial pass (recorded as "Verified sound"):** the `ensureCanvas`
resize-listener "leak" (the DOM dedups an identical listener reference), two claims that
the new ESLint/CI config was "dead on arrival" (it passes), and the `sideEffects: false`
concern (correct as-is). 80 candidates → 73 confirmed (consolidated to 19 distinct) → 7 refuted.

**Headline:** the security surface is genuinely small and SSR-safety holds, but the
**`createTactile` lifecycle is the bug cluster** — a stale-async race, a lost-update in
`set({events})`, and no teardown path are all reachable from ordinary runtime use, and
all three converge on a single fix: a proper `dispose()` + spec-token guards. The
particle engine is the performance hotspot.

## Changes made (source)
**No library logic changed.** Only additive `// AUDIT-NNN` locator comments + the two
AUDIT-016 cross-repo doc-reference repoints. `dist/` rebuilt to match (comment-only diff,
size still within budget). Tooling/config files added (not library logic).

## Verification results

| Gate | Result |
|------|--------|
| `npm run build` | ✓ tsc clean (typecheck + emit) |
| `npm test` | ✓ **6/6** passing (`pattern.test.ts`) |
| `npm run lint` | ✓ 0 errors, 1 warning (AUDIT-013 `prefer-const`, intentionally non-blocking) |
| `npm run size` | ✓ all 5 entry points within gzip budget (index 3.71/6 KB) |
| `dist/` drift | ✓ rebuilt; 0 non-comment changed lines across `dist/*.js` |

## Deferred items
All 19 findings are **documented, not fixed** (this was a review). Intentional non-goals
are tracked in [`DEFERRED.md`](../DEFERRED.md). The biggest ready-to-run follow-up is a
combined **`dispose()` + spec-token guards + shower-timer tracking** change (closes
AUDIT-001/003/005 together), then the **README iOS/buzz + override-granularity wording**
(AUDIT-004/014), then the **particle perf pass** (AUDIT-006/007/012).

## Notes for future reviewers
- The source is **carefully, heavily commented** — the iOS audio-unlock and "resume on
  every gesture" comments in `index.ts` are **load-bearing** (they encode ERR-001/002).
  Don't strip them.
- Re-run the review with the **fallow MCP** enabled (paste-in snippet in `TOOLING.md`) for
  dead-code/complexity/clone analysis — the particle engine is the complexity hotspot.
- `dist/` is committed and CI guards drift — any future `src/` change must rebuild + commit `dist/`.
- The 7 refuted candidates are in `code-audit.md` → "Verified sound"; don't re-file them.
- When the findings get fixed, **remove the `// AUDIT-NNN` comments** at the same time
  (they'll otherwise re-inflate `dist/` and read as open issues).
