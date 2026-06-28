# Architecture — @dalin/tactile

> The system map for `@dalin/tactile`: what the pieces are, how one semantic call
> fans out into three channels, and where the deliberate seams are. Read this
> before changing anything in `src/`. Findings from reviews live in
> [`code-audit.md`](./code-audit.md); the review process is [`CODE_REVIEW.md`](./CODE_REVIEW.md).

## What it is (in one breath)

A **zero-dependency, SSR-safe browser library**. `createTactile(config)` returns a
small object whose **semantic methods** (`success`, `selection`, `impact`, …) each
fire every **enabled channel** in concert:

- **haptic** — `navigator.vibrate` on Android; a `<input switch>` Taptic tick on iOS.
- **sound** — Web Audio: a built-in zero-asset synth pack, or a developer-supplied sample pack.
- **motion** — on-screen feedback: a canvas emoji-particle burst + a springy WAAPI "boop".

The whole surface is shaped like Capacitor / iOS `UIFeedbackGenerator` so a **native
backend can slot in later without touching call sites** (the "swap seam").

## The one diagram

```
                                createTactile(config)
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              │                         │                          │
         events: EventTable        backend: HapticBackend     channels (lazy)
         (presets.ts +             (web | silent)             ├─ sound:  SoundChannel?
          user overrides)                                     └─ motion: MotionDriver?
              │
   t.success(target) ──► fireEvent("success") ──► fire(recipe, target)
                                                      │
                          ┌───────────────────────────┼────────────────────────────┐
                          ▼                            ▼                             ▼
                   recipe.haptic                 recipe.sound                  recipe.motion
                   backend.cancel()              sound.play(cue)               motion.render(spec)
                   backend.fire(recipe,          (Web Audio synth/             (boop via WAAPI +
                    strength)                     sample pack)                  canvas particle burst)
                          │
                   pattern.ts: stepsToPattern() ──► navigator.vibrate([on,off,…])   (Android)
                   ios-switch.ts: iosTick()      ──► <input switch>.click()         (iOS)
```

## File map

| File | Role |
|------|------|
| `src/index.ts` | **The core.** `createTactile()` — the instance state machine: channel enable/disable, audio-context unlock, the `fire()`/`fireEvent()` dispatch, `set()`, `diagnose()`, `test()`, and target coercion (`toTarget`). |
| `src/types.ts` | **The whole public type surface** — `Tactile`, `TactileConfig`, `EventRecipe`, `HapticRecipe`, `SoundPack`, `MotionDriver`, `MotionSpec`, etc. Re-exported from the package root. |
| `src/presets.ts` | `DEFAULT_EVENTS` (the semantic vocabulary → per-channel recipes) and `resolveEvents()` (merge user overrides onto defaults). `PRESET_EVENTS` drives `test()`. |
| `src/pattern.ts` | `stepsToPattern()` — flattens a haptic step sequence into a `navigator.vibrate` `[on, off, …]` array, PWM-approximating sub-full `intensity`. The only unit-tested module. |
| `src/platform.ts` | `detectPlatform()` — coarse iOS / Android / desktop / standalone-PWA detection from the UA + media queries. |
| `src/ios-switch.ts` | The iOS Taptic hack: a hidden, `aria-hidden` `<label><input switch></label>` whose `.click()` makes WebKit play a tick. |
| `src/backends/web.ts` | `createWebBackend()` — routes a recipe to `iosTick()` (iOS) or `navigator.vibrate()` (Android); reports `probe()`. |
| `src/backends/silent.ts` | `createSilentBackend()` — the no-op backend for SSR / unsupported engines. |
| `src/sound/synth.ts` | `synthPack` — the built-in, zero-asset Web Audio synth cues (the `sound: true` default). |
| `src/sound/sample.ts` | `createSamplePack()` — build a pack from real audio files (fetched + decoded once). |
| `src/sound/index.ts` | The `@dalin/tactile/sound` entry point. |
| `src/motion/dom-driver.ts` | `domMotionDriver` — the built-in `MotionDriver`: `boop` (WAAPI) + `particles` (delegates to particles.ts). |
| `src/motion/particles.ts` | The canvas emoji-particle engine — a single shared full-screen canvas, a self-stopping rAF loop, emoji rasterization cache, collisions. Adapted from lochie/web-haptics (MIT). |
| `src/motion/index.ts` | The `@dalin/tactile/motion` entry point. |

## Entry points & packaging

Three public entry points, declared in `package.json` `exports`:

| Import | Ships | Lazily loaded? |
|--------|-------|----------------|
| `@dalin/tactile` | `dist/index.js` — `createTactile` + all types | — |
| `@dalin/tactile/sound` | `dist/sound/index.js` — `synthPack`, `createSamplePack` | core dynamically `import()`s the synth pack only when `sound: true` |
| `@dalin/tactile/motion` | `dist/motion/index.js` — `domMotionDriver`, `particleBurst` | core dynamically `import()`s the dom driver only when `motion: true` |

- **Build:** `tsc` only (`npm run build`). No bundler. Output is ESM + `.d.ts` + source maps in `dist/`.
- **`dist/` is committed.** Installs are `github:gomezsj12/dalin-tactile` (not yet on npm), and there is intentionally **no `prepare` script**, so every package manager (npm/pnpm/yarn/bun) can install without a build step. `.gitattributes` marks `dist/**` `linguist-generated`. See [`STACK_DECISIONS.md`](./STACK_DECISIONS.md).
- **`sideEffects: false`** — refers to *module-evaluation* side effects (there are none at import time), which keeps the package tree-shakeable. Note that *calling* `createTactile()` does have runtime side effects (it attaches global gesture listeners) — see lifecycle below.

## The instance lifecycle (`createTactile` in `src/index.ts`)

`createTactile()` is a closure factory — all state lives in locals, no classes.

1. **Resolve config** → `events` table, `hapticsOn`, `strength`, `volume`, `scale`, `debug`.
2. **Pick the backend** synchronously: `silent` if not a browser or `backend: "silent"`, else `web`.
3. **Channels are opt-in and lazily constructed:**
   - `enableSound(spec)` — `false` | `true` (built-in synth) | a `SoundPack`. Creating/resuming the `AudioContext` happens **synchronously inside the enabling gesture** (doing it after the async `import()` is what previously left iOS silent); the pack itself is `import()`-ed and `create()`-d asynchronously.
   - `enableMotion(spec)` — `false` | `true` (built-in dom driver) | a `MotionDriver`.
4. **Audio unlock:** while in the browser, capturing listeners for `pointerdown` / `touchend` / `mousedown` / `keydown` call `resumeAudio()` on **every** gesture (resuming on a single first gesture was a prior bug — iOS re-suspends).
5. **Firing:** `fireEvent(name, target)` looks up `events[name]` and calls `fire(recipe, toTarget(target))`, which dispatches to each enabled channel. Haptics are cancelled before each fire so a new event supersedes an in-flight pattern.
6. **Runtime retune:** `set(partial)` toggles `haptics`/`sound`/`motion`, rescales `strength`/`volume`/`scale`, or merges new `events`.
7. **Diagnostics:** `diagnose()` returns a `TactileReport` (backend, channels, platform, vibrate/iosSwitch probes, audio state, reduced-motion, and plain-English `notes`). `test()` fires every preset in sequence with gaps.

> **No teardown.** The returned `Tactile` has no `dispose()`/`destroy()`. The global
> listeners and the `AudioContext` live for the page's lifetime. This is fine for
> the documented "one shared instance" usage, but is a real constraint under
> React StrictMode / HMR / SPA route churn — see [`code-audit.md`](./code-audit.md).

## Channel 1 — Haptics

**The platform reality** (also in the README): the web has no real haptics API.
Android exposes `navigator.vibrate` (binary on/off, no amplitude). iOS Safari has
no Vibration API — only the `<input switch>` Taptic trick. The library owns a thin,
tunable layer over this and is honest about the fragility living in the platform.

- **Recipe → pattern (`pattern.ts`).** A `HapticRecipe` is a list of `HapticStep`s
  (`duration`, `delay`, `intensity`). `stepsToPattern()` flattens them into a
  `navigator.vibrate` array:
  - `strength` (global) scales each step's **duration** — the only lever that
    changes perceived power on the web (no amplitude control exists).
  - sub-full `intensity` is **PWM-approximated**: the on-time is chopped into
    ~10 ms windows whose duty cycle equals the intensity. Full intensity collapses
    to one solid pulse.
  - The pattern always begins on an on-value (a leading `delay` is encoded as a
    `0`-length on-pulse to preserve on/off parity). This is the contract the unit
    tests in `pattern.test.ts` pin.
- **Backend dispatch (`backends/web.ts`).** On iOS, `fire()` calls `iosTick()`
  once and returns (the step durations don't apply — iOS only has a discrete
  tick). On Android, it calls `navigator.vibrate(pattern)` and records the return
  value for diagnostics.
- **iOS switch (`ios-switch.ts`).** A hidden `<label><input switch></label>` is
  appended once; clicking the label makes WebKit play a tick. Apple patched the
  script-driven path in iOS 26.5 — the documented follow-up (a real, finger-toggled
  invisible overlay switch) slots in **here** without changing callers.

## Channel 2 — Sound

- **Synth pack (`sound/synth.ts`)** — the `sound: true` default. Each cue is a
  tiny oscillator + gain envelope (a few of them layered for `thud`/`success`/etc.).
  Zero asset weight; lazy-loaded so a haptics-only build never bundles it. The
  `buzz` cue is a sustained sawtooth with a square-LFO tremolo (~2.5 s).
- **Sample pack (`sound/sample.ts`)** — `createSamplePack({ baseUrl, cues })`
  fetches + decodes real audio files once (e.g. curated CC0 sounds), then plays
  them on demand. Files are **not** bundled — you point at a folder you control.
- The active pack is a `SoundChannel` (`{ name, cues, play(cue, {volume}) }`).
  The single shared `AudioContext` is created lazily and resumed on user gestures.

## Channel 3 — Motion

- **`domMotionDriver` (`motion/dom-driver.ts`)** renders a `MotionSpec`:
  - `boop` — a springy transform pulse on `target.el` via the Web Animations API.
  - `particles` — an emoji burst at a viewport point (resolved from `target.x/y`,
    else the element centre, else viewport centre).
  - `custom` — caller-supplied `play(target, runtime)`.
  - `none` — no-op. The driver returns early when `runtime.reducedMotion` is set.
- **Particle engine (`motion/particles.ts`)** — a single shared, `pointer-events:none`,
  top-`z-index` full-screen canvas; a requestAnimationFrame loop that **runs only
  while particles are alive and stops itself when idle**; emoji are pre-rasterized
  to offscreen canvases for fast `drawImage`. A `duration` option keeps spawning
  bursts at an interval for a sustained "shower". Adapted from lochie/web-haptics (MIT).
- **Pluggable.** Pass any `MotionDriver` (e.g. a thin wrapper around `canvas-confetti`,
  `tsParticles`, or `react-rewards`) as `createTactile({ motion: myDriver })` — the
  "wrap only when you need more" half of the design.

## Events & recipes

`DEFAULT_EVENTS` (`presets.ts`) maps each `EventName`
(`selection | light | medium | heavy | success | warning | error | buzz`) to an
`EventRecipe` spanning up to all three channels. `resolveEvents(overrides)` clones
the defaults and merges overrides **per channel** (`haptic` / `sound` / `motion`
are replaced wholesale, not deep-merged field-by-field — keep this in mind when
documenting override granularity). The `impact()`/`notification()` methods are
sugar over the matching event names; `play()` accepts an event name, a raw
duration in ms, or a custom step array.

## SSR / robustness model

Everything that touches a browser global is guarded:

- `const isBrowser = typeof window !== "undefined"` gates the backend choice and
  listener attachment; outside the browser `createTactile()` returns a working
  object backed by the **silent** backend, so you can construct it anywhere and
  call it freely (calls are no-ops until hydration).
- `detectPlatform()` returns a desktop default when `navigator` is undefined.
- `ios-switch.ts` and `particles.ts` bail when `document` is undefined.
- Audio context construction is wrapped in try/catch and tolerates a missing
  `AudioContext` / `webkitAudioContext`.

## Diagnostics

`diagnose()` is the support tool: it returns the backend kind, which channels are
live, the detected platform, the `navigator.vibrate` probe (exists + last return),
the iOS-switch availability, the audio-context state, the reduced-motion flag, and
a `notes: string[]` of plain-English explanations ("navigator.vibrate returned true
but if you feel nothing, the OS vibration setting or battery saver is off"). `test()`
fires every preset with 500 ms gaps for on-device tuning.

## Relationships to sibling repos

- **`../tactile-site`** (the public demo, `tactile.dalin.pro`) **vendors a copy of
  `dist/`** at `src/lib/tactile/`. There is no sync script, so the two can drift —
  treat `tactile.dalin.pro` as the design source of truth, and re-copy `dist/`
  after a release. (Tracked as a finding.)
- **`../notes-app`** is the first intended consumer (swap its `web-haptics` helper
  for `@dalin/tactile`). The haptics roadmap/migration thinking that several source
  comments reference originated in `notes-app/docs/`; the locally-relevant parts are
  mirrored here in [`STACK_DECISIONS.md`](./STACK_DECISIONS.md) and [`DEFERRED.md`](./DEFERRED.md)
  so this repo's docs stand alone.
- The `demo/` folder is a self-contained, dependency-free local harness served by
  `demo/server.mjs` that imports the freshly-built `dist/` directly.
