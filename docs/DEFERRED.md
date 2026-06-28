# Deferred — out of scope until explicitly pulled in

> Deliberately unbuilt work, with the reason and a "revisit when". This is **not**
> the bug list (that's [`code-audit.md`](./code-audit.md)) — these are conscious
> non-goals. Don't bolt them on without the listed prerequisites.

| What | Why deferred | Revisit when |
|------|--------------|--------------|
| **Publish to npm** | Needs the `dalin` npm org (for the scoped `@dalin/tactile` name) or a fallback to unscoped `dalin-tactile`. GitHub install works today. | Owner decides scoped vs unscoped and claims the org. Removes the committed-`dist/` requirement. |
| **Native (Capacitor) backend** | The `HapticBackend` seam and `backend: "native"`-shaped config already exist, but no native backend is wired. Real amplitude haptics need a Capacitor plugin + the app shipping a native shell. | An adopting app ships a Capacitor shell and wants guaranteed OS haptics. Slots in behind the existing interface — no call-site changes. |
| **Framework adapters** (`useTactile` React hook, Vue/Svelte helpers) | The library is intentionally framework-agnostic; the README shows the one-line `useMemo` pattern. A tiny hook would standardize "one shared instance" and ergonomic call sites. | After the core API is frozen. Keep it a separate entry point so the core stays framework-free. |
| **`dispose()` / `destroy()` on the instance** | Today an instance's global gesture listeners + `AudioContext` live for the page's lifetime (fine for the documented single-instance usage, leaky under StrictMode/HMR/SPA churn — see `code-audit.md`). A teardown method is an API addition, not a bug fix. | Before/with the React adapter (a hook needs a cleanup path). Design it to remove listeners, close the `AudioContext`, and make the instance inert. |
| **Curated CC0 sample pack** | `createSamplePack` exists; a ready-made, rights-cleared pack (freesound / Kenney) would be a drop-in "realness" upgrade. Asset hosting + licensing audit required. | When a consumer wants richer sound without sourcing their own files. Ship as a separate package or a `/sound/packs` export so the core stays asset-free. |
| **Example `MotionDriver`s** (canvas-confetti / tsParticles / react-rewards wrappers) | The `MotionDriver` interface supports them; documented but not provided, to keep zero deps. | When asked for heavier effects. Ship as docs/examples or an optional package, never a core dependency. |
| **iOS "real switch" overlay** | iOS 26.5 patched the script-driven `<input switch>` tick. The documented follow-up is an invisible overlay switch the user's own finger toggles. | When iOS-haptic reliability on ≥26.5 matters enough. It slots into `ios-switch.ts` behind `iosTick()` with no caller change. |
| **Browser / e2e test harness** | Channels are browser-side-effect-heavy (Web Audio, canvas, `navigator.vibrate`); jsdom can't meaningfully exercise them. Only `pattern.ts` is unit-tested. | When regressions in firing/coordination need automated coverage. Playwright with a real Chromium + a `navigator.vibrate` spy is the likely shape. |
| **Preset "recipe" editor in the demo** | A visual tuner (adjust steps/emojis/sounds, export the `events` override) would speed device tuning. Pure demo-side feature. | After the preset library stabilizes. Lives in `demo/` (and `tactile-site`), not the package. |
| **Richer motion specs** (trails, directional bursts, per-call overrides) | The current `MotionSpec` union covers boop + particles. Expanding it is additive but widens the public type surface. | When a real consumer need appears. Extend the `MotionSpec` union; keep old specs working. |

## Adoption (first consumers — sequencing, not commitments)

- **dalin. notes** — swap `web-haptics` for `@dalin/tactile` (call sites unchanged),
  then turn on sound + motion. The migration thinking lives in `notes-app/docs/`.
- **cspr-patchlist / cm-church-patchlist** — replace the hand-rolled `navigator.vibrate`
  helpers; they gain iOS haptics + sound + motion for free, collapsing divergent copies
  into one shared dependency.

> Smallest-first with the best payoff: a `dispose()` + the React `useTactile` hook
> together (they need each other), then the native backend once an app needs it.
