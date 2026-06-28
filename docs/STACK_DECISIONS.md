# Stack Decisions — @dalin/tactile

> Why each architectural choice was made, and what was rejected. Read this before
> proposing a stack change (e.g. "add a bundler", "publish to npm now", "depend on
> a particle library") — the trade-off was likely already weighed.

The defining constraint set: **zero runtime dependencies**, **tiny**, **SSR-safe**,
**framework-agnostic**, and a surface **shaped for a future native backend** so call
sites never change when real OS haptics arrive.

## The defining decision: own a thin tunable layer, don't paper over the platform

The web has no real haptics API. Android has `navigator.vibrate` (binary, no
amplitude); iOS Safari has no Vibration API at all (only the `<input switch>`
Taptic hack, which Apple can and did patch — iOS 26.5). No library can make that
"unbreakable" because the fragility lives in the platform.

So `@dalin/tactile` deliberately **does not pretend to**. It owns a thin layer you
can fix fast and reuse everywhere, **coordinates three channels** (haptic + sound +
motion) from one semantic call — which nothing else does — and keeps a
**Capacitor-shaped surface** so a native backend slots in later.

- **Rejected:** wrapping an existing haptics lib. They're single-channel and don't
  coordinate sound + on-screen motion, and they inherit the same platform fragility.

## Zero runtime dependencies

Every channel is hand-rolled: PWM vibration patterns, a Web Audio synth, a canvas
particle engine (ported from lochie/web-haptics, MIT). Result: nothing to audit,
nothing to version-bump, trivially tree-shakeable, tiny install.

- **Rejected: depending on `canvas-confetti` / `tsParticles` / `react-rewards`.**
  Each is heavier than the whole library and pulls the bundle up. Instead they're
  supported as **opt-in `MotionDriver`s** — wrap one yourself only when you want
  more than the built-in burst. "Dependency-free by default, pluggable when needed."
- **Rejected: `use-sound` / Howler.** The built-in cues are a handful of oscillators;
  a sample pack (`createSamplePack`) covers "real" sounds without bundling assets.

## `tsc`-only build, no bundler

The package is published as ESM with `.d.ts` and source maps, emitted straight by
`tsc`. Three entry points (`.`, `./sound`, `./motion`) are real files, and the core
**dynamically `import()`s** the sound/motion chunks so a haptics-only consumer never
pays for them — the bundler on the *consumer's* side does the code-splitting.

- **Rejected: tsup/rollup/esbuild.** Adds a dependency and config for no benefit at
  this size; `tsc` already produces correct ESM + types. Revisit only if a CJS build
  or bundled single-file output is required.

## `dist/` committed, no `prepare` script

The package isn't on npm yet; it installs from GitHub
(`github:gomezsj12/dalin-tactile`). For that to work across **every** package
manager (npm/pnpm/yarn/bun) without each running a build, the compiled `dist/` is
**committed** and there is intentionally **no `prepare`/`prepublishOnly`-on-install**
hook. `.gitattributes` marks `dist/**` `linguist-generated` so diffs/reviews collapse it.

- **Consequence (tracked):** `dist/` can go stale vs `src/`. The CI workflow rebuilds
  and fails on a `dist/` diff to guard this; humans must `npm run build` + commit
  `dist/` with any `src/` change until npm publish removes the need.
- **Rejected: a `prepare` script.** It builds on install, which breaks `pnpm`/`yarn`/
  `bun` GitHub installs that don't run it consistently — the original reason `dist/`
  is committed (see git history: "add prepare script…" was reverted in favor of this).

## Capacitor / `UIFeedbackGenerator`-shaped API

The semantic methods (`impact("light"|"medium"|"heavy")`, `notification(...)`,
`selection()`) mirror iOS's `UIFeedbackGenerator` and Capacitor's Haptics plugin on
purpose. A `HapticBackend` interface (`fire` / `cancel` / `probe`, `kind: web | native | silent`)
is the **swap seam**: today only `web` and `silent` exist; a `native` backend can be
added behind the exact same surface, so an app that ships a Capacitor shell gets real
amplitude haptics with **no call-site changes**.

- **Rejected: a haptics-only API.** Sound + motion are first-class because on desktop
  (no vibration motor) and on a patched iOS they carry the feedback.

## Channels opt-in, lazily loaded

Defaults: `haptics: true`, `sound: false`, `motion: false`. Enabling sound/motion
triggers a dynamic `import()` of that chunk. This keeps the common case (a drop-in
replacement for a plain `navigator.vibrate` helper) as small as possible, and makes
sound/motion a pay-for-what-you-use upgrade.

## SSR-safe by construction

`createTactile()` returns a working object even with no DOM (backed by the silent
backend), so it can be constructed at module scope in Next.js / SvelteKit / Nuxt and
called freely on the client. Every browser-global access is `typeof`-guarded. This is
why there's **no** "are we mounted yet?" ceremony for consumers.

## Testing: Vitest, unit-only (for now)

Only `pattern.ts` (the PWM/`vibrate` pattern flattening) has unit tests — it's the
one piece of pure, deterministic logic with a precise contract. The channels are
browser-side-effect-heavy (Web Audio, canvas, `navigator.vibrate`) and are better
covered by on-device `diagnose()`/`test()` than by jsdom mocks. A browser/e2e harness
is a documented future addition (see [`DEFERRED.md`](./DEFERRED.md)).

## Tooling adopted 2026-06-27 (first review)

- **ESLint (flat config) + Prettier** added as dev tooling. ESLint lints `src/` only;
  Prettier is available (`npm run format`) but the existing source is hand-formatted
  and not yet Prettier-clean, so format is **advisory** until a one-time reformat is
  approved (see [`code-audit.md`](./code-audit.md)).
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — build, test, lint, size budget,
  and a `dist/` drift guard.
- **Bundle-size budget** (`scripts/check-size.mjs`) — gzipped-size gate per entry point;
  the library's "tiny" promise is now enforced.
