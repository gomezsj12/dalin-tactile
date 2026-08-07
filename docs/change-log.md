# Change log

What changed, when, and why. Most recent first.

## 2026-08-07 (heavy becomes one pulse)

- **`heavy` is a single hit now.** It was two events: an 80 ms rough pulse at 0.8
  duty, an 85 ms gap, then a 60 ms solid landing. The rough half read as weak, and
  the gap made the whole thing arrive as two medium taps instead of one hard one.
  The recipe is now one 150 ms step at full duty, which emits `[150]`: the longest
  unbroken on-time in the ladder, and nearly twice `medium`'s 80 ms.

- **The ladder still separates.** `medium` and `heavy` are now the same shape at
  different weights, so the rung that used to carry the contrast is `light`, whose
  0.3 duty keeps it airy and rough against the two solid pulses above it. iOS is
  unaffected: it maps to the `heavy` Taptic style either way, and ignores duration.

## 2026-08-07 (20 ms PWM and retuned defaults)

- **PWM windows widened.** `PWM_PERIOD_MS` rose from 10 ms to 20 ms. At 10 ms,
  0.5 duty gives an Android LRA motor 5 ms on-time; its mass never reaches
  amplitude and low-passes the train into one blip. At 20 ms, 0.7 duty gives
  14 ms on-time, enough for partial response and perceptible roughness.

- **Hardware exposed the bug.** In `dalin. stash`, `selection`, `press`, `toggle`,
  and `light` felt identical on a real Android phone. Their old emitted patterns
  were `[5,5,2]`, `[6,4,5]`, `[7,3,7,3,3]`, and `[7,3,7,3,5]`; `selection`
  supplied only 7 ms of motor time. On the same phone, notes-app's 20 ms
  `web-haptics` window felt varied. Its similarly weighted `medium`
  `[14,6,4,1]` and `heavy` `[35]` had opposite, distinct feel.

- **Defaults separate feel.** `DEFAULT_EVENTS` now distinguishes rough, smooth,
  and airy runs first, rhythm second, and coarse weight last. A textured run is
  one sub-full-intensity step; discrete events are separate steps with `delay`.
  The claim that numeric spread felt "deliberately EXTREME" was removed.

- **Bounds remain intact.** `MAX_PWM_WINDOWS_PER_STEP` stays 64; widening starts
  past 1280 ms instead of 640 ms. Three tests in `src/pattern.test.ts` pin 20 ms
  emission, match `intensity` with hand-rolled steps at the same duty, and amend
  chopping coverage. All 15 tests pass.

- **Built output shipped.** `npm run build` refreshed committed `dist/`.

- **Convergence.** After the library adopted the tuning proven in `dalin. stash`,
  the app removed its overrides. Seven of 12 rungs now emit byte-identical arrays.
  The other five differ only by one 4-12 ms gap because a chopped step's trailing
  off-window merges with `delay`.

- **Vendored copy guard.** Added `scripts/sync-site.mjs` and the `sync:site` and
  `sync:site:check` scripts to detect and repair missing, stale, and orphan files
  in `tactile-site`. Verification found 56 files in sync; a perturbed file failed
  the check and was repaired.

- **Site-owned CI.** Added the site's first workflow, which checks pushes to `main`
  and pull requests for drift. The check lives with the stale artifact, where the
  fix can be committed, and closes AUDIT-015 after two silent drifts, including
  the 20 ms carrier and preset rewrite.

## 2026-07-25 (buzz reverted, em dashes gone repo-wide)

- **`buzz` reverted.** The rebuild gave it a detuned octave under a 700 Hz lowpass
  to make it hum rather than rasp. It sounded worse, so the original recipe is back
  verbatim: 120 Hz sawtooth, gain 0.12, tremolo 28 Hz, no filter and no partials.
  It is now the only cue in the pack with neither. Confirmed against a replica of
  the pre-rebuild signal path in `OfflineAudioContext`: peak 0.344 vs 0.327, RMS
  0.123 vs 0.115, and RMS above 1 kHz 0.0359 vs 0.0338, so the harmonics the
  lowpass had been eating are back. The remaining few percent is the soft-clip
  shaper's 1.74 slope standing in for the old flat 1.6 master gain.
- **Em dashes removed from every tracked file**, per the machine-wide writing
  contract, finishing the pass that covered five docs earlier today. This round
  took the other 11 markdown files (146 of them) plus source comments in 10 `src/`
  files, `demo/index.html`, `eslint.config.js`, `scripts/check-size.mjs`,
  `.prettierignore` and the CI workflow. Three were not comments at all but text a
  user reads: the `package.json` `description`, and two `diagnose()` notes strings.
  All 16 markdown files now pass `lint-writing.mjs`, and `git ls-files | xargs grep
  -l` finds no remaining instance anywhere in the repo.
- **Generated output rebuilt:** `dist/` refreshed from `src/`, since the comment
  text is emitted into it.

## 2026-07-25 (synth pack rebuilt: 20 cues, 5 new events, `cue()`)

Prompted by [cuelume](https://github.com/Danilaa1/cuelume), whose pitch is a palette of
cues with genuinely different shapes rather than variations on one click. Our pack had
seven cues, every one a bare oscillator plus a gain ramp.

- **Synth engine rewritten.** A cue is now a stack of *voices*: one source (an
  oscillator, or a burst read from a shared 1 s noise buffer) plus an envelope, and
  optionally a biquad with a cutoff sweep, harmonic or inharmonic partials, a tremolo
  LFO, and a few cents of random pitch drift so rapid repeats don't machine-gun.
  Partial stacks are gain-normalized, so `gain` means the same thing whether a voice
  has one layer or four.
- **Voices layer.** `delay` (a gap after the previous voice) became `at` (an offset
  from the cue's onset). Filtered-noise transients now sit *on top of* tonal bodies
  instead of in front of them, which is most of why the clicks read as physical.
  `thud`'s two sub-bass booms are finally simultaneous.
- **AUDIT-008 fixed.** `master.gain` 1.6 became 1.0 plus a tanh soft-clip `WaveShaper`
  as the last node before the destination, so output is bounded to ±1 by construction.
  The curve's slope at zero supplies the old loudness boost. Verified with
  `OfflineAudioContext` renders; see the finding for the measured table.
- **Cues: 7 to 20.** All seven were re-voiced (`medium` moved from `tap` to `press`, so
  the impact ladder is audible as well as felt). New: `press`, `release`, `toggle`,
  `loading`, `ready`, `page` back new events; `chime`, `sparkle`, `droplet`, `bloom`,
  `pop`, `whisper`, `swipe` are palette-only timbres. Levels were measured and
  levelled, not eyeballed: `swipe` first rendered at 0.068 peak against `press` at
  0.55, because a bandpass discards most of white noise's energy.
- **Events: 8 to 13.** `press`, `release`, `toggle`, `loading`, `ready` each fire all
  three channels. `press` boops to scale 0.94, below 1, so the element goes in.
- **New public API.** `cue(name, opts?)` plays one sound cue with no haptic and no
  motion (`opts.volume` multiplies the instance volume rather than replacing it);
  `cues()` lists what the active pack knows. `SYNTH_CUES` and the `SynthCue` union are
  exported from `@dalin/tactile/sound`.
- **Tests added:** every default event names a cue the built-in pack actually has (the
  contract that otherwise fails silently, as a mute event), every event resolves on all
  three channels, and `cue()` is a safe no-op with no `AudioContext`. 13 pass.
- **Size budget:** `dist/sound/synth.js` raised 4 KB to 6 KB gzipped; it measures 4.51.
- **Demo:** a "More events" row and a 20-chip sound palette, both kept visible on
  phones, since a phone speaker is where these get judged.
- **Generated output rebuilt:** `dist/` refreshed from `src/`.

## 2026-06-28 (AUDIT-010 test spacing)

- **AUDIT-010 fixed:** `createTactile().test()` now spaces each preset by the
  recipe's haptic and motion duration, with the existing 500 ms minimum preserved
  for short cues.
- **Tests added:** Focused fake-timer coverage now pins long haptic and motion
  recipe spacing in the diagnostic sequence.

## 2026-06-28 (AUDIT-011 PWM expansion cap)

- **AUDIT-011 fixed:** Long fractional-intensity haptic steps now widen their PWM
  period once needed, keeping custom buzz-style vibration patterns bounded while
  preserving approximate duration and duty cycle.
- **Generated output rebuilt:** `dist/` refreshed from `src/` so GitHub installs stay in
  sync.

## 2026-06-28 (AUDIT-004 iOS buzz caveat)

- **AUDIT-004 fixed:** README and source comments now describe `buzz` accurately across
  platforms: Android can run the long vibration step, while iOS haptics are one Taptic
  tick and sound + motion carry the multi-second duration. Runtime behavior is unchanged.

## 2026-06-28 (AUDIT-009 backend docs alignment)

- **AUDIT-009 fixed:** `TactileConfig.backend` JSDoc and the backend-selection source
  comment now match current behavior: browser `"auto"`/`"web"`/omitted use the web
  backend, `"silent"` forces no-op, and SSR/no DOM always returns silent. Native remains
  deferred; runtime behavior is unchanged.

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
- **Findings:** 19 catalogued: **0 Critical, 3 High, 3 Medium, 13 Low**.
  The `createTactile` lifecycle is the bug cluster (stale-async channel re-enable race,
  `set({events})` lost-update, no `dispose()`); the particle engine is the perf hotspot;
  security + SSR-safety verified sound. Produced by a multi-agent run with adversarial
  verification (80 candidates → 73 confirmed → 7 refuted).
- **Source:** review-only, with **no library logic changed**. Additive `// AUDIT-NNN`
  locator comments at finding sites across 8 `src/` files; the two cross-repo doc
  references repointed to local docs (AUDIT-016). `dist/` rebuilt to stay in sync
  (verified comment-only). Gates green: build ✓, test 6/6 ✓, lint ✓ (1 tracked warning),
  size ✓.

## Earlier (from git history, pre-review)

- `169e01c` feat(buzz): make buzz a continuous multi-second buzz across all channels
- `fa7280a` feat: add buzz event, make it installable from GitHub, mirror the demo to the public site
- `147cb22` feat: re-export the public type surface from the package root
- `b001981` docs: add ROADMAP
- `09acf6f` build: add prepare script so the package builds on install
- `8d0bb2b` feat: initial release of @dalin/tactile
