# Code Review — Process, Checklists & Anti-Patterns

This document defines the code-review process for **@dalin/tactile**. It is written
for AI agents (Claude Code, Cursor Composer, GPT-based agents) and human reviewers alike.

The *process* (phased review, findings catalogue, dated session logs, severity levels)
is shared with the dalin app family (it originated in `mail-app` and matured in
`notes-app`/`drive-app`). The *checklists and anti-patterns* below are **re-tuned from
scratch** for this codebase, which is materially different from those apps: a
**zero-dependency, SSR-safe browser library** with no server, no database, no auth, no
framework, and a `tsc`-only build. Backend/DB/PWA/auth checklists do not apply here;
**channel coordination, browser-API fragility, resource lifecycle, mobile performance,
and packaging** do.

**Session records** are stored as individual files in [`reviews/`](./reviews/) with
timestamped filenames — they are **not** appended to this file. See
[`docs/README.md`](./README.md) for the naming convention.

---

## How to use this document

- **Before a review:** read this whole file, then [`../AGENTS.md`](../AGENTS.md) (the
  canonical rules) and [`ARCHITECTURE.md`](./ARCHITECTURE.md) (the channel model).
- **During a review:** follow the phases in order; don't skip. Document findings in
  [`code-audit.md`](./code-audit.md) before implementing any fix.
- **After a review:** create a session log in `reviews/YYYY-MM-DD-<short-description>.md`.

> **Output discipline:** a review's primary output is **findings in
> [`code-audit.md`](./code-audit.md)** plus a **session log in [`reviews/`](./reviews/)**.
> Do **not** change library logic during a review unless explicitly asked. If you do
> change code: one change at a time, `npm run build` + `npm test` after each, rebuild
> `dist/`, all documented in the session log.

---

## Codebase overview (read first)

| Layer | What | Key files |
|-------|------|-----------|
| Core | `createTactile()` instance state machine | `src/index.ts` |
| Types | The entire public API surface | `src/types.ts` |
| Events | Semantic vocabulary → per-channel recipes | `src/presets.ts` |
| Haptic | PWM `vibrate` pattern + iOS tick | `src/pattern.ts`, `src/backends/web.ts`, `src/backends/silent.ts`, `src/ios-switch.ts` |
| Sound | Web Audio synth + sample packs | `src/sound/{synth,sample,index}.ts` |
| Motion | Canvas particles + WAAPI boop | `src/motion/{particles,dom-driver,index}.ts` |
| Platform | UA / media-query detection | `src/platform.ts` |
| Build | `tsc` → committed `dist/` | `tsconfig.json`, `package.json`, `.gitattributes` |
| Tests | Vitest (unit, `pattern.ts` only) | `src/pattern.test.ts` |
| Demo | Dependency-free local harness | `demo/index.html`, `demo/server.mjs` |

Full details: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Code review process (phased approach)

Phases run lowest-risk → highest-risk. Complete each before the next. If a review is
documentation-only, stop after Phase 2.

### Phase 1: Documentation audit
- [ ] `docs/change-log.md` reflects all commits in `git log`
- [ ] `docs/ARCHITECTURE.md` matches the current file map, entry points, channel model, and lifecycle
- [ ] `docs/error-log.md` includes recently fixed bugs (esp. the audio-unlock and iOS-tick lessons)
- [ ] `docs/code-audit.md` — new findings since last review? Any "Open" findings now fixed?
- [ ] `README.md` claims match the code (channel defaults, the `events` override semantics, the platform notes)
- [ ] `AGENTS.md` / `CLAUDE.md` read-order, key-files table, and rules still accurate

### Phase 2: Code comments audit
- [ ] Every exported function/type/interface has a doc comment; every source file has a file-level comment
- [ ] Inline comments explain the non-obvious mechanics (PWM duty cycle, the iOS gesture/audio-unlock invariant, the self-stopping rAF loop, the parity rule in `stepsToPattern`) — not self-evident code
- [ ] Comments match current behavior (no stale comments after a recipe/preset change)
- [ ] The cautionary comments are intact (the "resume on ANY gesture (NOT once)" and "create context SYNCHRONOUSLY in the gesture" notes in `src/index.ts` are load-bearing — never delete them)

### Phase 3: Correctness & lifecycle (the `createTactile` state machine)
This is the highest-bug-density area — closures, async channel loads, and global resources.
- [ ] **Channel enable/disable races:** the async closures in `enableSound`/`enableMotion` that resolve a dynamic `import()` must re-check that the requested spec is still current before assigning `sound`/`motion` — a fast toggle issued mid-load must not be clobbered by a stale in-flight enable
- [ ] **`set({events})` accumulation:** confirm successive `set({events})` calls compose as the caller expects (watch for re-merging from the original constructor config and dropping a prior `set`)
- [ ] **Idempotent re-enable:** `enableSound(true)`/`enableMotion(true)` twice must not tear down and rebuild a loaded channel
- [ ] **Resource teardown:** the instance attaches capturing global listeners and may open an `AudioContext`. Is there a teardown path? Track the cost under React StrictMode / HMR / SPA churn (listener + `AudioContext` accumulation)
- [ ] **Haptic supersede:** `fire()` cancels before firing so a new event replaces an in-flight pattern; confirm `cancel()` is a no-op-safe when `vibrate` is unavailable
- [ ] **`toTarget` coercion:** `Element` / `MouseEvent` / `{x,y}` all resolve correctly; SSR returns `{}`

### Phase 4: Channels deep-dive
**Haptic / `pattern.ts`:**
- [ ] `stepsToPattern` parity holds (pattern starts on an on-value; leading delay → `0`-length on-pulse); trailing silence dropped; the unit tests still pin the contract
- [ ] PWM expansion is bounded — a long, low-`intensity` step doesn't explode the pattern array
- [ ] iOS path fires a single tick and ignores step durations (correct — document, don't "fix")

**Sound / Web Audio:**
- [ ] The `AudioContext` is created lazily, resumed in-gesture and on every gesture (ERR-001/002 invariants)
- [ ] `master.gain` headroom (currently 1.6) vs clipping when cues sum; `sustain`/`tremolo` envelopes don't leave nodes running
- [ ] `createSamplePack` tolerates missing/failed files (a bad cue stays silent, never throws); decoded buffers are reused

**Motion / particles:**
- [ ] The rAF loop runs only while particles are alive and stops itself when idle
- [ ] Collision/draw cost is bounded at the `MAX_ACTIVE` cap (watch the O(n²) collision pass)
- [ ] The `duration` shower's timers are accounted for (cancelation, stale coordinates after scroll/unmount)
- [ ] `prefers-reduced-motion` suppresses motion (driver returns early); the demo's override is demo-only
- [ ] The shared canvas / resize listener / emoji cache don't leak on canvas re-creation

### Phase 5: Performance (mobile-first)
- [ ] No avoidable per-fire allocation/work in the hot path (`fire`, `detectPlatform` caching)
- [ ] Particle engine stays smooth on a low-end phone at realistic burst rates (rapid taps, sustained `success`/`buzz` showers)
- [ ] Web Audio node creation per cue is acceptable (no pool needed at UI-cue rates) — confirm, don't assume
- [ ] Bundle size within budget (`npm run size`); lazy channels actually code-split

### Phase 6: API surface & type safety
- [ ] Exported types in `src/types.ts` match runtime behavior (e.g. `config.backend` accepted values vs what `index.ts` branches on; `events` override granularity vs the README wording)
- [ ] No `as any`; `as`/non-null `!` casts are justified (the `particles.ts` `!` usage, the `webkitAudioContext`/`navigator.standalone` casts)
- [ ] The `Tactile` interface is complete for documented usage (note any missing teardown)
- [ ] `play()` / `impact()` / `notification()` handle their full input domain (unknown event name → safe no-op)
- [ ] Public re-exports from the package root stay in sync with `types.ts`

### Phase 7: SSR / robustness / accessibility / security
- [ ] Every browser global is `typeof`-guarded; `createTactile()` is safe to construct with no DOM
- [ ] Injected DOM (`ios-switch` label, particle canvas) is `aria-hidden`, `pointer-events:none`, and non-interfering
- [ ] Reduced-motion respected by default
- [ ] **Security surface is small but real:** `createSamplePack` fetches developer-supplied URLs (not user input — fine, but note any path that could take untrusted input); `demo/server.mjs` guards path traversal (`startsWith(ROOT)`). No `eval`, no `innerHTML`, no secrets.

### Phase 8: Build, packaging & tooling
- [ ] `npm run build` is clean (typecheck + emit); `dist/` is committed and **in sync with `src/`**
- [ ] `package.json` `exports` map points at real emitted files; `sideEffects: false` is correct (no import-time side effects)
- [ ] No runtime `dependencies`
- [ ] `npm test` green; `npm run lint` clean (or warnings tracked); `npm run size` within budget
- [ ] No stray `console.log` in library paths (the `debug`-gated `console.warn`/`console.log` are intentional)

---

## Anti-patterns to watch for

Patterns that have caused (or will cause) issues here or in sibling haptics code. Flag them every review.

### 1. Unguarded browser global (SSR crash)
**Pattern:** `window.`/`document.`/`navigator.`/`matchMedia(`/`new AudioContext()` without a `typeof` guard.
**Why:** the library is constructed at module scope in server frameworks; a bare global throws during SSR/build.
**Where:** anywhere in `src/`, especially new code in `index.ts`/`platform.ts`/`motion`.
**Fix:** guard with `typeof x !== "undefined"` (or the existing `isBrowser`), return the silent/no-op path.

### 2. Audio-context work moved behind an `await`
**Pattern:** creating/resuming the `AudioContext` after the dynamic `import()` resolves.
**Why:** iOS only unlocks audio synchronously inside the gesture — this is exactly ERR-001 (iOS silent).
**Where:** `src/index.ts` `enableSound`.
**Fix:** create + resume the context synchronously in the enabling gesture; await only the pack `create()`.

### 3. Resuming audio only once
**Pattern:** unlocking audio on the first gesture and never again.
**Why:** iOS re-suspends the context (ERR-002) → silent after the first interaction.
**Where:** `src/index.ts` gesture listeners + `fire()`.
**Fix:** resume idempotently on every gesture while suspended.

### 4. Stale async channel enable clobbering a newer toggle
**Pattern:** the `import()`-then-assign closure in `enableSound`/`enableMotion` assigns `sound`/`motion` without re-checking that `soundSpec`/`motionSpec` is still the value it was loading for.
**Why:** a `set({sound:false})` (or a switch to a different pack) issued before the import resolves gets overwritten — the channel re-enables itself after the caller turned it off.
**Where:** `src/index.ts` `enableSound`/`enableMotion` async closures.
**Fix:** capture the requested spec and bail in the closure if `spec !== current` before assigning.

### 5. Statically importing a lazy channel into the core
**Pattern:** `import { synthPack } from "./sound/..."` (or the motion driver) at the top of `index.ts`.
**Why:** defeats the dynamic-`import()` code-splitting — a haptics-only consumer now bundles sound/motion.
**Where:** `src/index.ts`.
**Fix:** keep sound/motion behind `await import(...)`; only `import type` is allowed statically.

### 6. Adding a runtime dependency
**Pattern:** `npm install <effects/audio lib>` and importing it in `src/`.
**Why:** breaks the zero-dep promise, bloats the bundle, and re-introduces the fragility the library was built to own.
**Where:** `package.json` `dependencies`.
**Fix:** support it as an opt-in `MotionDriver`/`SoundPack` the consumer supplies.

### 7. Forgetting to rebuild/commit `dist/`
**Pattern:** changing `src/` without `npm run build` + committing `dist/`.
**Why:** `dist/` is the shipped artifact for GitHub installs (no `prepare` script); a stale `dist/` ships old behavior.
**Where:** every `src/` change.
**Fix:** rebuild and stage `dist/` in the same commit; CI fails on drift.

### 8. Unbounded vibration pattern from PWM
**Pattern:** a long-duration, sub-full-`intensity` step (e.g. a custom 2500 ms / 0.5 buzz) expands to a huge `[on,off,…]` array.
**Why:** `stepsToPattern` chops on-time into ~10 ms PWM windows → hundreds of entries; some engines cap pattern length.
**Where:** `src/pattern.ts`, custom `events`/`play()` input.
**Fix:** be aware of the expansion; consider a cap/floor for very long low-intensity steps; document the limit.

### 9. O(n²) work in the particle frame
**Pattern:** pairwise collision (or any per-pair) work scaling with the particle count, with a high `MAX_ACTIVE`.
**Why:** at the 500-particle cap that's ~125k checks/frame — a jank source on low-end mobile during sustained showers.
**Where:** `src/motion/particles.ts` `resolveCollisions`.
**Fix:** spatial hashing / a lower active cap / skip collisions past a threshold; measure before/after.

### 10. Leaking timers, listeners, or canvases (no teardown)
**Pattern:** scheduling shower `setTimeout`s with no cancelation, adding a `resize` listener per canvas creation, or constructing an instance whose global listeners + `AudioContext` never release.
**Why:** under SPA route churn / React StrictMode / HMR these accumulate; browsers cap `AudioContext`s (~6 in Chrome).
**Where:** `src/motion/particles.ts`, `src/index.ts`.
**Fix:** track + clear timers; add a `dispose()` that removes listeners and closes the context (see `DEFERRED.md`); add resize listeners once.

### 11. Type/behavior/README drift
**Pattern:** `config.backend` accepts a value the code never branches on, or the README claims field-level event overrides while `resolveEvents` replaces a whole channel.
**Why:** consumers type against the surface and read the README; drift is a silent correctness gap.
**Where:** `src/types.ts`, `src/index.ts`, `README.md`.
**Fix:** make the type, the runtime branch, and the README agree in one change.

### 12. Overstating a platform capability
**Pattern:** describing `buzz` as a "continuous multi-second vibration" without the iOS caveat (iOS fires one tick per call regardless of duration).
**Why:** the haptic claim is false on iOS — sound + motion carry the sustained feel there.
**Where:** `README.md`, `presets.ts` comments, `diagnose()` notes.
**Fix:** keep platform claims honest and per-platform; let `diagnose()` tell the truth.

### 13. Clipping the master gain
**Pattern:** pushing `master.gain` > 1 (currently 1.6) and summing several simultaneous cues.
**Why:** Web Audio sums to the destination; overlapping loud cues can clip/distort, especially on phone speakers.
**Where:** `src/sound/synth.ts`.
**Fix:** if clipping is observed, add a soft limiter / lower headroom; treat the boost as a tuning knob with a known risk.

### 14. Reformatting or hand-editing generated/hand-formatted files
**Pattern:** running `prettier --write` across `src/` inside an unrelated change, or hand-editing `dist/`.
**Why:** the source is hand-formatted (not Prettier-clean) — a bulk reformat buries the real change; `dist/` is generated.
**Where:** all of `src/`, all of `dist/`.
**Fix:** keep edits minimal; reformat only in a dedicated, owner-approved commit; never edit `dist/` (rebuild from `src/`).

### 15. Dropping the whole burst under load
**Pattern:** refusing to spawn any particles when a burst would exceed `MAX_ACTIVE`, rather than spawning a partial burst.
**Why:** under rapid input the visual feedback vanishes entirely right when the user is most active.
**Where:** `src/motion/particles.ts` `spawn`.
**Fix:** spawn up to the remaining headroom instead of an all-or-nothing drop.

---

## Agent-specific guidance

### For Claude Code agents
- Full Read/Write/Edit/Bash access. After any code change: `npm run build && npm test && npm run lint && npm run size`, then rebuild + stage `dist/`.
- Read `AGENTS.md` before modifying any `src/` file — it carries the SSR, audio-unlock, lazy-channel, and committed-`dist/` rules this checklist enforces.
- The **fallow** MCP (paste-in snippet in [`TOOLING.md`](./TOOLING.md)) is the fast path for dead-code/complexity/duplication — the particle engine is the complexity hotspot.
- New review session log: `docs/reviews/YYYY-MM-DD-<short-description>.md`.
- Multi-line commit messages: match the heredoc to the shell tool (Bash heredoc in the Bash tool, PS here-string in the PowerShell tool) — see `AGENTS.md` "Git push hygiene".

### For Cursor Composer / GPT-based agents
- **Do not** treat this like a Next.js/React/Node-backend project — it's a `tsc`-built, zero-dependency **browser library**. Don't suggest a framework, a server, a bundler, or a state manager.
- **Don't statically import the sound/motion chunks into `index.ts`** — the core lazy-loads them via dynamic `import()`. A top-level import silently bloats every consumer.
- **Every browser global needs a `typeof` guard** — the library is SSR-safe and runs at module scope in server frameworks.
- **Don't bulk-reformat** `src/` — it's hand-formatted and not Prettier-clean; a reformat buries your change. (Prettier adoption is a separate, owner-approved commit.)
- Check [`code-audit.md`](./code-audit.md) before "fixing" something — it may be an intentional design choice (PWM patterns, the iOS single-tick, `master.gain` headroom, committed `dist/`).

### For GitHub Copilot / autocomplete
- Zero dependencies — completions importing `howler`/`canvas-confetti`/`framer-motion` are wrong here.
- A suggestion touching `window`/`document`/`navigator` without a guard breaks SSR — the human must add the guard.
- `dist/` is generated — never hand-edit it; the human owns rebuilding `dist/` and updating `docs/`.

### For any agent performing a code review
1. **Read first:** `AGENTS.md` → `ARCHITECTURE.md` → `code-audit.md` → this file.
2. **Don't change library logic during a review** unless asked — output is findings + a session log.
3. **If you do change code:** one change at a time, `build` + `test` after each, rebuild `dist/`, documented.
4. **Severity levels:**
   - **Critical** — security vulnerability, data corruption/loss, or crash. Must fix before release.
   - **High** — broken feature, logic bug, or significant performance issue.
   - **Medium** — code quality, maintainability, or minor performance. Fix when touching that file.
   - **Low** — style, polish, best practice. Nice to have.

---

## Session records

Stored as individual markdown files in [`reviews/`](./reviews/).

**Naming:** `YYYY-MM-DD-<short-description>.md`

**Required sections in each session log:**
- Reviewer (agent type and model)
- Requested by
- Scope (what was reviewed)
- Work done this run
- Findings summary (counts by severity + IDs)
- Changes made (if any — file + action)
- Verification results (build, test, lint, size)
- Deferred items
- Notes for future reviewers
