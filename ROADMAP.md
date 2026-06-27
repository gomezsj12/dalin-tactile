# Roadmap

Status and planned work for **@dalin/tactile**. Contributions welcome.

## Shipped

- [x] Three coordinated channels — **haptics + sound + motion** — from one tunable, Capacitor-shaped API
- [x] Pure-web haptic backend (Android `navigator.vibrate` + iOS `<input switch>` Taptic tick)
- [x] Built-in synth sound pack + a sample-pack loader (`createSamplePack`)
- [x] Canvas emoji-particle engine + springy **boop**, `prefers-reduced-motion` aware
- [x] `diagnose()` / `test()` on-device diagnostics
- [x] SSR-safe · zero runtime deps · TypeScript types · unit tests

## Next

- **Publish to npm.** Decide scoped (`@dalin/tactile` — needs the `dalin` npm org) vs unscoped (`dalin-tactile`).
- **CI.** GitHub Action running `npm run build` + `npm test` on pushes / PRs.
- **Native backend (Capacitor).** A `native` `HapticBackend` behind the same surface, so apps shipping a native shell get guaranteed OS haptics — real amplitude, no iOS-switch fragility. The API is already shaped for this swap.
- **Framework adapters.** A tiny React hook (`useTactile`) — one shared instance, ergonomic call sites.
- **Richer packs.** An optional curated **CC0 sample pack** (freesound / Kenney); example `MotionDriver`s wrapping `canvas-confetti` / `tsParticles` / `react-rewards`.
- **Docs / demo site.** Host the `demo/` so anyone can feel it on their phone.

## Later / ideas

- Expanded preset library + a haptic "recipe" editor in the demo (tune visually, export).
- Per-call overrides and richer motion specs (trails, directional bursts).

## Adoption (dalin apps)

First consumers:

- **dalin. notes** — swap `web-haptics` for `@dalin/tactile` (call sites unchanged), then turn on sound + motion.
- **cspr-patchlist / cm-church-patchlist** — replace the hand-rolled `navigator.vibrate` helpers; they gain iOS haptics + sound + motion for free, collapsing the divergent copies into one shared dependency.
