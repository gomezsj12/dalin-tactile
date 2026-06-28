# Code Audit — Findings Catalogue

> Last updated: **2026-06-28** — fixed AUDIT-014 after the first comprehensive review
> of `@dalin/tactile`,
> and the run that stood up this review system. Session log:
> [`reviews/2026-06-27-initial-comprehensive-review.md`](./reviews/2026-06-27-initial-comprehensive-review.md).
> This was a **documentation + review pass — no library logic was changed**; the only
> source edits are additive `// AUDIT-NNN` locator comments + clarifying notes.

This file catalogues every finding from code reviews. **Findings are never deleted** —
when fixed, their status is updated to "Fixed" with the date/commit.

**Severity levels:**
- **Critical** — security vulnerability, data corruption/loss, or crash. Must fix before release.
- **High** — broken feature, logic bug, or significant performance issue.
- **Medium** — code quality, maintainability, or minor performance. Fix when touching that file.
- **Low** — style, polish, best practice. Nice to have.

**Finding ID scheme:** `AUDIT-NNN`, sequential, never reused. Line numbers drift as code
changes; the `// AUDIT-NNN` locator comment in source is the durable anchor.

**Method note:** findings were produced by a multi-agent review (5 dimension finders +
a completeness critic) in which **every candidate was adversarially verified** (an
independent skeptic tried to refute it). 80 candidates → 73 confirmed (with heavy
cross-finder overlap, consolidated here into 19 distinct findings) → 7 refuted (recorded
in [Verified sound](#verified-sound-no-finding) so they aren't re-litigated).

---

## Summary

| Severity | Open | Fixed | Total |
|----------|------|-------|-------|
| Critical | 0 | 0 | 0 |
| High | 3 | 0 | 3 |
| Medium | 3 | 0 | 3 |
| Low | 11 | 2 | 13 |
| **Total** | **17** | **2** | **19** |

| ID | Sev | Title |
|----|-----|-------|
| AUDIT-001 | High | Stale async channel-enable race: an in-flight `import()` clobbers a later `set({sound/motion:…})` |
| AUDIT-002 | High | `set({events})` re-merges from the constructor config, silently dropping prior runtime overrides |
| AUDIT-003 | High | No `dispose()`: each instance leaks 4 capturing window listeners (+ an `AudioContext`) for the page lifetime |
| AUDIT-004 | Medium | iOS `buzz` is a single Taptic tick, not the "continuous ~2.5s vibration" the README/preset advertises |
| AUDIT-005 | Medium | Sustained particle showers schedule uncancelable `setTimeout`s that re-spawn at stale coordinates |
| AUDIT-006 | Medium | O(n²) per-frame particle collision pass (~125k checks/frame at the 500 cap) |
| AUDIT-007 | Low | `spawn()` drops the entire burst at `MAX_ACTIVE` instead of spawning the remaining headroom |
| AUDIT-008 | Low | Synth `master.gain = 1.6` with no limiter — overlapping cues can clip |
| AUDIT-009 | Low | `backend: "auto"` (and `"web"`) both resolve to web; type/JSDoc/behavior drift (and SSR silently downgrades `"web"` → silent) |
| AUDIT-010 | Low | `test()` uses a fixed 500 ms gap shorter than some cues, truncating long haptics / overlapping showers |
| AUDIT-011 | Low | Unbounded PWM pattern expansion for a long, low-`intensity` custom step |
| AUDIT-012 | Low | Per-frame per-particle emoji `Map.get` lookup in the draw loop (micro-optimization) |
| AUDIT-013 | Low | `let particles` is never reassigned — should be `const` (ESLint `prefer-const`) |
| AUDIT-014 | Low | Channel-level event overrides replace a channel's recipe wholesale, vs the README's "keep their defaults" wording |
| AUDIT-015 | Low | `tactile-site` vendors a byte copy of `dist/` with no sync/drift guard |
| AUDIT-016 | Low | Shipped source JSDoc references a cross-repo path (`notes-app/docs/haptics-roadmap.md`) |
| AUDIT-017 | Low | Source is hand-formatted, not Prettier-clean — adoption needs a one-time reformat |
| AUDIT-018 | Low | `play(0)` / `play([])` calls `backend.cancel()` then no-ops, silently killing an in-flight vibration |
| AUDIT-019 | Low | Synth creates 2–6 Web Audio nodes per cue with no reuse/disconnect (acceptable; monitor) |

---

## Findings

### AUDIT-001: Stale async channel-enable race clobbers a later toggle

**Severity:** High
**Files:** `src/index.ts` (`enableSound` ~110–122; `enableMotion` ~141–149)
**Status:** Open

`enableSound(pack)` sets `soundSpec = pack`, then in an async IIFE awaits the dynamic
`import()` and `resolved.create(ctx)` and **unconditionally** assigns
`sound = channel; soundName = channel.name`. There is no re-check that `soundSpec` is
still `pack` after the awaits. If a caller does `set({ sound: false })` (or switches to
a different pack) while the load is in flight, the original closure resolves afterward
and **re-enables the channel the caller just turned off** (or resurrects the wrong
pack). `diagnose()` then reports the channel on, and `fire()` will play it. With
`createSamplePack` the await window spans `fetch` + `decodeAudioData` of every cue
(hundreds of ms), so the race is easily hit from a settings toggle. `enableMotion`'s
`driver === true` branch has the same defect (window is a single dynamic import, so
narrower). The state self-corrects on the next `set()`.

**Recommendation:** Capture the requested spec as a local token and guard the
post-await assignment — `if (soundSpec !== pack) return;` before assigning (and the
matching `motionSpec !== driver` check in `enableMotion`).

---

### AUDIT-002: `set({events})` drops prior runtime overrides

**Severity:** High
**Files:** `src/index.ts` (`set`, ~225)
**Status:** Open

`set({ events })` computes `resolveEvents({ ...config.events, ...next.events })`, where
`config.events` is the **immutable constructor config**. Two successive `set({events})`
calls therefore don't accumulate: the second re-bases on the original constructor
overrides and **silently discards the first `set`'s overrides**. A consumer tuning two
different events across two settings interactions will find the first reverts. This is a
lost-update bug in a public method, with no error or warning.

**Recommendation:** Maintain a mutable accumulator —
`appliedOverrides = { ...appliedOverrides, ...next.events }`, then
`events = resolveEvents(appliedOverrides)` — or merge per-event onto the current table.
Document whether per-call overrides are meant to be cumulative or replacing.

---

### AUDIT-003: No `dispose()` — per-instance listener + `AudioContext` leak

**Severity:** High
**Files:** `src/index.ts` (gesture listeners ~156–161; returned object ~204–241; `getAudioContext` ~76–90)
**Status:** Open

Every `createTactile()` attaches **four capturing `window` listeners**
(`pointerdown`/`touchend`/`mousedown`/`keydown`) and may lazily open an `AudioContext`,
but the returned `Tactile` has **no `dispose()`/`destroy()`** — the listeners and the
context live for the page's lifetime. For the documented "one shared instance" usage
this is fine, but under **React StrictMode / HMR / SPA route churn** repeated
construction accumulates listeners and can exhaust the browser `AudioContext` cap
(~6 in Chrome), after which sound silently fails. (Note: `onGesture` is already a single
stable reference, so removal is straightforward.)

**Recommendation:** Add a `dispose()` to the `Tactile` interface that `removeEventListener`s
the four gesture handlers and `audioCtx?.close()`s, and (paired with AUDIT-005) clears
any pending particle-shower timers. Document calling it on unmount. Tracked in
[`DEFERRED.md`](./DEFERRED.md) as an API addition.

---

### AUDIT-004: iOS `buzz` is a single tick, not a continuous vibration

**Severity:** Medium
**Files:** `src/backends/web.ts` (~15–19), `src/presets.ts` (`buzz`), `README.md`
**Status:** Open

The `buzz` preset and README market a "continuous ~2.5 s buzz" across all channels, but
on iOS `web.fire()` calls `iosTick()` once and returns, ignoring the 2500 ms haptic
step (iOS has no Vibration API — only the discrete `<input switch>` tick). So on iOS the
**haptic** channel of `buzz` is a single tick; only sound + motion run the full duration.
The claim is accurate on Android, false on iOS.

**Recommendation:** Document the iOS limitation per-platform (e.g. "iOS: a single tick;
sound + motion carry the duration"), and/or — if a sustained iOS feel is wanted — repeat
`iosTick()` on an interval across the recipe duration to approximate a rattle. Keep
`diagnose()`'s honesty. See [`error-log.md`](./error-log.md) ERR-004.

---

### AUDIT-005: Uncancelable particle-shower timers re-spawn at stale coordinates

**Severity:** Medium
**Files:** `src/motion/particles.ts` (`particleBurst`, ~225–240)
**Status:** Open

A `duration` shower schedules `floor(duration / 150)` `setTimeout`s, each re-spawning a
burst at the **originally captured** `(x, y)`. The timers are not tracked or cancelable,
and they ignore later element movement / scroll / unmount, and don't stop if motion is
disabled mid-shower. Bounded by `MAX_ACTIVE`, so mostly cosmetic, but a long `buzz`
shower keeps firing at a now-wrong point if the page scrolls, and there's no way to stop it.

**Recommendation:** Track the scheduled timer ids and expose a cancel (tie it into the
`dispose()` of AUDIT-003); re-resolve the anchor from the live target element each tick
when an element target is given; stop the shower when the canvas/host is gone.

---

### AUDIT-006: O(n²) per-frame particle collision pass

**Severity:** Medium
**Files:** `src/motion/particles.ts` (`resolveCollisions` ~108–138; `MAX_ACTIVE` = 500)
**Status:** Open

`resolveCollisions()` runs a pairwise pass every rAF frame with no spatial partitioning.
At the `MAX_ACTIVE = 500` cap that's ~125k distance checks per frame; a single `buzz`
holds only ~80 particles (~3k checks), so the worst case needs several stacked
showers/rapid taps — but on a low-end phone the collision pass is the most likely jank
source under sustained load.

**Recommendation:** Gate collisions behind a lower particle threshold (skip above ~80),
make them opt-in, or add uniform-grid spatial hashing for the broad phase. Measure
before/after on a real device. Lowering `MAX_ACTIVE` is the cheapest mitigation.

---

### AUDIT-007: Whole-burst drop at `MAX_ACTIVE`

**Severity:** Low
**Files:** `src/motion/particles.ts` (`spawn`, ~199)
**Status:** Open

`spawn()` does `if (particles.length + amount > MAX_ACTIVE) return` — it drops the
**entire** burst rather than spawning the remaining headroom. Under rapid input the
visual feedback vanishes entirely right when the user is most active.

**Recommendation:** Spawn `Math.min(amount, MAX_ACTIVE - particles.length)` (clamped
≥ 0) so the burst degrades gracefully; optionally trim the oldest particles when full.

---

### AUDIT-008: Synth `master.gain = 1.6` with no limiter

**Severity:** Low
**Files:** `src/sound/synth.ts` (~57–58)
**Status:** Open

`master.gain.value = 1.6` (a deliberate boost — "phone speakers are quiet") feeds
`ctx.destination` with no limiter. Overlapping cues (a sustained 2.5 s `buzz` under
rapid taps, or `thud`'s layered sub-bass booms) can sum past 1.0 and hard-clip.

**Recommendation:** Insert a `DynamicsCompressorNode` (or a soft-clip `WaveShaper`)
between `master` and `destination` as a safety limiter, or lower the master gain and
boost per-cue gains. Treat the boost as a tuning knob with a known clip risk.

---

### AUDIT-009: `backend` type ↔ behavior ↔ JSDoc drift

**Severity:** Low
**Files:** `src/index.ts` (~67–68), `src/types.ts` (`TactileConfig.backend` ~155–156)
**Status:** Open

`TactileConfig.backend` accepts `"auto" | "web" | "silent"` and its JSDoc says
`"auto" = native if wired, else web`, but `index.ts` only branches on `=== "silent"`:
`"auto"`, `"web"`, and `undefined` all resolve to the web backend, and the typed
`BackendKind` value `"native"` is currently unconstructable. Separately, an explicit
`backend: "web"` is silently downgraded to `silent` under SSR (indistinguishable from
intent). Type-faithful but misleading.

**Recommendation:** Keep the forward-looking type, but soften the JSDoc to "auto/web
both select the web backend today; native is deferred (see ROADMAP)", or branch on
`"auto"` explicitly. Low priority — it's documentation accuracy, not a runtime bug.

---

### AUDIT-010: `test()` fixed 500 ms gap truncates long cues

**Severity:** Low
**Files:** `src/index.ts` (`test`, ~234–240)
**Status:** Open

`test()` waits a fixed 500 ms between presets, which is shorter than several cues' total
duration (e.g. the `error` triple-thud, the `success` 600 ms shower). Long haptics get
superseded by the next event's `backend.cancel()` and particle showers overlap, so
`test()` doesn't faithfully demo each preset to completion. (`buzz`, being last, is the
mildest case.)

**Recommendation:** Derive the inter-event delay from each recipe's total haptic/motion
duration (or special-case the long ones) so each preset plays to completion.

---

### AUDIT-011: Unbounded PWM pattern expansion

**Severity:** Low
**Files:** `src/pattern.ts` (`stepsToPattern`, ~39–46)
**Status:** Open

A long-duration, sub-full-`intensity` step expands to a large `[on, off, …]` array
(on-time chopped into ~10 ms PWM windows). The built-in presets are safe (full-intensity
long steps collapse to one pulse), but a custom `events`/`play()` step like 2500 ms at
intensity 0.5 yields a ~500-element pattern, and some engines cap pattern length.

**Recommendation:** Cap the total expanded pattern length (or scale `PWM_PERIOD_MS` up
for very long steps) and document that fractional intensity over long durations produces
large patterns.

---

### AUDIT-012: Per-frame emoji `Map.get` lookup in the draw loop

**Severity:** Low
**Files:** `src/motion/particles.ts` (`frame` draw loop, ~168; `getEmojiCanvas` ~43–58)
**Status:** Open

The render loop calls `getEmojiCanvas(p.emoji)` (a `Map.get`) for every particle every
frame. Cheap, but resolvable once at spawn.

**Recommendation:** Resolve and store each particle's rasterized canvas reference on the
`Particle` at spawn time instead of a per-frame `Map` lookup. Micro-optimization — do it
opportunistically when touching the engine for AUDIT-006.

---

### AUDIT-013: `let particles` should be `const`

**Severity:** Low
**Files:** `src/motion/particles.ts` (~35)
**Status:** Fixed (2026-06-28)

`let particles: Particle[] = []` is mutated (push/pop/index) but never reassigned, so it
should be `const`. ESLint flags it; the rule is set to **warn** (not error) in
`eslint.config.js` only because this review does not change library logic — flip it back
to `error` once the source is changed.

**Resolution:** Changed the binding to `const` and restored `prefer-const` to an ESLint
error.

---

### AUDIT-014: Channel overrides replace a recipe wholesale

**Severity:** Low
**Files:** `src/presets.ts` (`resolveEvents`, ~126–128), `README.md` (Tuning)
**Status:** Fixed (2026-06-28)

`resolveEvents` merges overrides **per channel** (`haptic`/`sound`/`motion` are taken
whole from the override or whole from the default), not field-by-field. The README's
"override just what you want — the rest keep their defaults" reads as field-level, but
overriding `events.success.motion` replaces the entire motion spec (you can't tweak just
`count`). Type-faithful, but the granularity isn't what the wording implies.

**Recommendation:** Clarify in the README Tuning section that a channel override replaces
that channel's recipe wholesale (re-supply the full channel object). No code change needed.

**Resolution:** README Tuning now says omitted channels keep defaults, while any supplied
channel replaces that whole recipe and should include the full desired channel spec.

---

### AUDIT-015: `tactile-site` vendors `dist/` with no sync guard

**Severity:** Low
**Files:** `../tactile-site/src/lib/tactile/**` (vendored copy of `dist/`)
**Status:** Open

The public demo (`tactile-site`) contains a **byte-identical hand-copy** of this
package's `dist/` at `src/lib/tactile/`, with no sync script or CI drift check. It's in
sync today, but a release that rebuilds `dist/` here will silently leave `tactile-site`
stale.

**Recommendation:** Have `tactile-site` consume the package as a real dependency
(`github:gomezsj12/dalin-tactile`) or add a `sync:site` script (copy `dist/` →
`../tactile-site/src/lib/tactile/`) plus a CI check that fails on divergence. (Cross-repo
fix — lives partly in `tactile-site`.)

---

### AUDIT-016: Cross-repo doc references in shipped source

**Severity:** Low
**Files:** `src/index.ts` (~10), `src/ios-switch.ts` (~39)
**Status:** Open

Two shipped source files' JSDoc point at `notes-app/docs/haptics-roadmap.md` — a path
that doesn't exist in this package (and is a private sibling repo). A consumer reading
the published source/types hits a dangling reference.

**Recommendation:** Repoint these at this repo's [`ROADMAP.md`](../ROADMAP.md) /
[`DEFERRED.md`](./DEFERRED.md) (which now cover the native-backend and iOS-overlay
follow-ups locally), or drop the cross-repo path. **This is the only finding whose source
comments this review updated in place** (the locator comments below repoint them).

---

### AUDIT-017: Source not Prettier-clean

**Severity:** Low
**Files:** all of `src/` (hand-formatted)
**Status:** Open

The source predates Prettier and is hand-formatted (manual line breaks the Prettier
config wouldn't produce, at any print width). Adopting Prettier as a hard gate requires a
one-time `npm run format` reformat. Until then `format:check` is **advisory** (CI runs it
non-blocking) so the gate isn't permanently red.

**Recommendation:** When the owner is ready, run `npm run format` in a dedicated commit
(reviewing the diff once), then flip the CI `Format check` step from `continue-on-error`
to a hard gate. Don't bulk-reformat inside an unrelated change.

---

### AUDIT-018: `play(0)` / `play([])` silently cancels an in-flight vibration

**Severity:** Low
**Files:** `src/index.ts` (`play` ~215–223 → `fire` ~169–182)
**Status:** Open

`play(0)` and `play([])` build a haptic recipe with an empty/zero pattern. `fire()` calls
`backend.cancel()` (→ `navigator.vibrate(0)`) **before** checking the pattern, so an
"empty" play **kills any in-flight vibration** as a side effect, with no caller-visible
signal that nothing was played.

**Recommendation:** Skip `backend.cancel()` when the resulting pattern is empty (guard in
`fire()` or move `cancel()` after the length check in `web.ts`), and document that
`play(0)` is a haptic no-op.

---

### AUDIT-019: Synth creates nodes per cue with no reuse/disconnect

**Severity:** Low
**Files:** `src/sound/synth.ts` (`playSpec` ~61–95)
**Status:** Open (acceptable — monitor)

Each `play(cue)` creates 2 Web Audio nodes per spec (up to 6 for `thud`, 4 for `buzz`)
with no pooling and no explicit `disconnect()` after the envelope ends (nodes are GC'd
once stopped). Fine at UI-cue cadence; could add GC pressure under pathological rapid
firing.

**Recommendation:** Acceptable as-is. If profiling shows audio GC pressure during rapid
ticks, debounce repeated identical cues and/or `disconnect()` nodes on `ended`. Recorded
so a future review doesn't re-flag it as new.

---

## Verified sound (no finding)

Checked explicitly and found correct — recorded so future reviews don't re-litigate.
The first three were **adversarially refuted** during this review (a finder flagged them;
a skeptic disproved the mechanism).

- **`ensureCanvas` resize listener is NOT a leak** — a finder claimed each canvas
  re-creation accumulates a `resize` listener. Refuted: `resize` is a single
  module-level function reference, and `addEventListener("resize", resize)` with the
  **same** reference + default capture is idempotent per the DOM spec (duplicate
  registrations are discarded). No accumulation. (`particles.ts:60,88`)
- **`sideEffects: false` is correct** — every module reachable from the three exports has
  **no import-time side effects** (only declarations); runtime side effects happen on
  `createTactile()` call, not module evaluation. Tree-shaking-safe. (`package.json:11`)
- **The new ESLint/CI config is not "dead on arrival"** — finders claimed the added
  scripts/deps don't exist and lint/CI would fail immediately. Refuted: `package.json`
  defines `lint`/`format`/`format:check`/`size`, `eslint.config.js` ignores `scripts/`
  and `**/*.mjs`, `npm run lint` exits 0 (one tracked `prefer-const` warning), and the
  size budget passes.
- **SSR-safety holds** — every browser-global access in `index.ts` / `platform.ts` /
  `ios-switch.ts` / `motion/*` is `typeof`-guarded or only reachable after a `document`
  existence proof. `createTactile()` returns a working silent object with no DOM.
- **`createSamplePack` has no injection/SSRF surface** — it `fetch`es **developer-supplied**
  manifest URLs (not user input), and a missing/failed file leaves that cue silent rather
  than throwing. (`sample.ts:38–49`)
- **`demo/server.mjs` guards path traversal** — it `normalize`s the joined path and
  rejects anything not `startsWith(ROOT)` before reading. Dev-only, but correct.
- **`stepsToPattern` parity contract is correct and unit-tested** — pattern starts on an
  on-value, a leading delay becomes a `0`-length on-pulse, trailing silence is dropped;
  `pattern.test.ts` pins all of it (6/6 green).
- **The self-stopping rAF loop is correct** — the particle loop runs only while particles
  are alive and nulls `raf` when idle, so it doesn't spin when nothing is on screen.
