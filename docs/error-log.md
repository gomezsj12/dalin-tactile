# Error Log — @dalin/tactile

> Bugs encountered and resolved during development, recorded so they aren't
> re-introduced. Backfilled 2026-06-27 from the cautionary comments already
> living in `src/index.ts` + `src/ios-switch.ts` and from git history. New bugs
> get a new entry.

**Error ID scheme:** `ERR-NNN`, sequential, never reused.

## Entry template

```
### ERR-NNN: <short title>

**Status:** Resolved | Open | Workaround
**Area:** <subsystem>

**Symptom:** …
**Root cause:** …
**Fix / workaround:** …
**Lesson:** …
```

---

### ERR-001: iOS stayed silent — AudioContext unlocked inside the async import

**Status:** Resolved
**Area:** Sound channel / audio unlock

**Symptom:** On iOS Safari the sound channel produced no audio, even though the
same code worked on desktop/Android.
**Root cause:** The `AudioContext` was created and `resume()`d *after* the dynamic
`import()` of the sound pack resolved — i.e. on a later microtask, no longer inside
the user-gesture call stack. iOS only unlocks audio when the context is created/resumed
**synchronously within a user gesture**; doing it post-`await` silently failed.
**Fix:** `enableSound()` now creates and resumes the `AudioContext` **synchronously
inside the enabling gesture**, before awaiting the pack import. The relevant comment
in `src/index.ts` reads: *"Create + resume the context SYNCHRONOUSLY within the
enabling gesture — doing it later (inside the async import) is what left iOS silent."*
**Lesson:** Any new audio path must touch the `AudioContext` synchronously in the
gesture. Never move context creation/resume behind an `await`.

---

### ERR-002: iOS audio re-suspended after the first gesture

**Status:** Resolved
**Area:** Sound channel / audio unlock

**Symptom:** Sound worked for the first interaction, then went silent on later taps.
**Root cause:** The audio context was resumed only **once**, on the first gesture.
iOS re-suspends a `WebKit` `AudioContext` (e.g. after backgrounding or idle), and
nothing resumed it again.
**Fix:** Capturing listeners for `pointerdown` / `touchend` / `mousedown` / `keydown`
call `resumeAudio()` on **every** gesture while suspended, and `fire()` also resumes
inside the tap. The comment in `src/index.ts` marks this: *"Resume audio on ANY
gesture while suspended (NOT once — the bug before)."*
**Lesson:** Treat the `AudioContext` as something that can re-suspend at any time;
resume idempotently on every gesture, not once. (Note: the always-on capturing
listeners are why the instance currently has no teardown — see `code-audit.md`.)

---

### ERR-003: iOS Taptic tick stopped working on iOS 26.5 (platform, not a bug)

**Status:** Workaround / platform limitation
**Area:** Haptic channel / iOS switch

**Symptom:** The iOS `<input switch>` Taptic tick produces no haptic on iOS ≥ 26.5.
**Root cause:** Apple patched the **script-driven** path for toggling a native
`<input switch>` in iOS 26.5. The library clicks the label to trigger the tick
(the path WebKit honored on iOS 17.4–26.4); that programmatic path is now inert.
**Fix / workaround:** None at the library level — the fragility is in the platform.
`diagnose()` says so explicitly in its `notes` ("iOS 26.5 patched the script path;
silence on ≥26.5 is the platform, not the app"). The documented follow-up is a real,
invisible **overlay switch the user's own finger toggles**, which slots into
`ios-switch.ts` behind `iosTick()` without changing any caller (see `DEFERRED.md`).
**Lesson:** Web haptics on iOS are inherently unstable across WebKit versions. Keep
the diagnosis honest (don't claim haptics "work" on iOS unconditionally) and keep the
swap seam ready for the native backend.

---

### ERR-004: `buzz` was a one-shot, not a continuous buzz

**Status:** Resolved (`169e01c`)
**Area:** Events / cross-channel coordination

**Symptom:** The `buzz` event fired a short blip rather than the intended sustained,
several-seconds buzz across all channels.
**Root cause:** The initial `buzz` recipe used short steps; sound/motion weren't held
for a duration.
**Fix:** `buzz` is now a single long haptic step (`duration: 2500`), a sustained
synth tone with tremolo (`sound/synth.ts` `buzz` cue), and a `duration: 2500` motion
shower — all three run for the full buzz. (Git: *"make buzz a continuous multi-second
buzz across all channels"*.)
**Lesson:** For sustained events, every channel needs its own duration/sustain
mechanism — a long vibrate step, a `sustain` audio envelope, and a `duration` particle
shower — kept roughly in sync. **Platform caveat:** on iOS the haptic is still a single
tick regardless of the 2500 ms step (one Taptic tick per call); the "continuous" feel
there comes from sound + motion only. Document this where `buzz` is described.
