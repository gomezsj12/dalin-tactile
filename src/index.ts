/**
 * @dalin/tactile — one call, three coordinated channels.
 *
 * createTactile() returns an object whose semantic methods (success, selection,
 * impact, …) fire every ENABLED channel together: a haptic (Android vibrate +
 * iOS switch tick), a sound (Web Audio), and motion (emoji burst / boop).
 * Choose haptics, sound, motion, or any combination.
 *
 * The haptic backend is a swap seam: pure-web today, native (Capacitor) later
 * behind the same surface. See notes-app/docs/haptics-roadmap.md.
 */
import type {
  BackendProbe,
  EventName,
  EventRecipe,
  EventTable,
  MotionDriver,
  MotionRuntime,
  MotionTarget,
  SoundChannel,
  SoundPack,
  Tactile,
  TactileConfig,
  TactileReport,
  Targetish,
} from "./types.js";
import { PRESET_EVENTS, resolveEvents } from "./presets.js";
import { createWebBackend } from "./backends/web.js";
import { createSilentBackend } from "./backends/silent.js";
import { detectPlatform } from "./platform.js";
import type { Platform } from "./platform.js";
import { iosSwitchAvailable } from "./ios-switch.js";

// Public type surface — so consumers can type their integration + custom packs.
export type {
  Tactile,
  TactileConfig,
  TactileReport,
  ChannelConfig,
  EventName,
  EventRecipe,
  EventOverrides,
  HapticStep,
  HapticRecipe,
  BackendKind,
  HapticBackend,
  BackendProbe,
  SoundPack,
  SoundChannel,
  MotionDriver,
  MotionSpec,
  MotionTarget,
  MotionRuntime,
  Targetish,
} from "./types.js";

const isBrowser = typeof window !== "undefined";

export function createTactile(config: TactileConfig = {}): Tactile {
  let events: EventTable = resolveEvents(config.events);
  let hapticsOn = config.haptics ?? true;
  let strength = config.strength ?? 1;
  let volume = config.volume ?? 1;
  let scale = config.scale ?? 1;
  const debug = config.debug ?? false;

  const backend =
    !isBrowser || config.backend === "silent" ? createSilentBackend() : createWebBackend();

  // ── sound channel: opt-in, lazily constructed, never bundled unless enabled ──
  let audioCtx: AudioContext | null = null;
  let sound: SoundChannel | null = null;
  let soundName: string | false = false;
  let soundSpec: boolean | SoundPack | undefined; // last requested — for idempotent re-enable

  function getAudioContext(): AudioContext | null {
    if (!isBrowser) return null;
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        audioCtx = new Ctor();
      } catch {
        return null;
      }
    }
    return audioCtx;
  }

  // Resume whenever suspended. Safe to call from any user gesture (iOS needs it).
  function resumeAudio(): void {
    const c = audioCtx;
    if (c && c.state !== "running") void c.resume().catch(() => {});
  }

  function enableSound(pack: boolean | SoundPack): void {
    if (pack === soundSpec) {
      if (pack) resumeAudio(); // already in this state — just keep it unlocked
      return;
    }
    soundSpec = pack;
    sound = null;
    soundName = false;
    if (!pack || !isBrowser) return;
    // Create + resume the context SYNCHRONOUSLY within the enabling gesture —
    // doing it later (inside the async import) is what left iOS silent.
    if (getAudioContext()) resumeAudio();
    void (async () => {
      try {
        const resolved: SoundPack =
          pack === true ? (await import("./sound/synth.js")).synthPack : pack;
        const ctx = getAudioContext();
        if (!ctx) return;
        const channel = await resolved.create(ctx);
        sound = channel;
        soundName = channel.name;
      } catch (err) {
        if (debug) console.warn("[tactile] sound pack failed to load", err);
      }
    })();
  }

  // ── motion channel: opt-in, lazily constructed ──────────────────────────────
  let motion: MotionDriver | null = null;
  let motionName: string | false = false;
  let motionSpec: boolean | MotionDriver | undefined; // last requested — for idempotent re-enable

  function enableMotion(driver: boolean | MotionDriver): void {
    if (driver === motionSpec) return; // already in this state — don't tear down a loaded driver
    motionSpec = driver;
    motion = null;
    motionName = false;
    if (!driver || !isBrowser) return;
    if (driver !== true) {
      motion = driver;
      motionName = driver.name;
      return;
    }
    void (async () => {
      try {
        const { domMotionDriver } = await import("./motion/index.js");
        motion = domMotionDriver;
        motionName = domMotionDriver.name;
      } catch (err) {
        if (debug) console.warn("[tactile] motion driver failed to load", err);
      }
    })();
  }

  if (config.sound) enableSound(config.sound);
  if (config.motion) enableMotion(config.motion);

  // Resume audio on ANY gesture while suspended (NOT once — the bug before).
  if (isBrowser) {
    const onGesture = (): void => resumeAudio();
    for (const ev of ["pointerdown", "touchend", "mousedown", "keydown"]) {
      window.addEventListener(ev, onGesture, { capture: true, passive: true });
    }
  }

  function reducedMotion(): boolean {
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ── firing ───────────────────────────────────────────────────────────────
  function fire(recipe: EventRecipe, target: MotionTarget): void {
    if (hapticsOn && recipe.haptic) {
      backend.cancel();
      backend.fire(recipe.haptic, strength);
    }
    if (sound && recipe.sound) {
      resumeAudio(); // we're inside the tap gesture — safe to unlock here too
      sound.play(recipe.sound, { volume });
    }
    if (motion && recipe.motion) {
      const runtime: MotionRuntime = { reducedMotion: reducedMotion(), scale };
      const specs = Array.isArray(recipe.motion) ? recipe.motion : [recipe.motion];
      for (const spec of specs) motion.render(spec, target, runtime);
    }
  }

  function fireEvent(name: EventName, target?: Targetish): void {
    const recipe = events[name];
    if (recipe) fire(recipe, toTarget(target));
  }

  function buildReport(): TactileReport {
    const platform = detectPlatform();
    const probe = backend.probe();
    return {
      backend: backend.kind,
      channels: { haptics: hapticsOn, sound: soundName, motion: motionName },
      platform,
      vibrate: probe.vibrate ?? { exists: false, lastReturn: null },
      iosSwitch: probe.iosSwitch ?? { available: iosSwitchAvailable() },
      audio: { enabled: soundName !== false, state: audioCtx ? audioCtx.state : "absent" },
      reducedMotion: reducedMotion(),
      notes: buildNotes(platform, probe, hapticsOn, soundName, motionName),
    };
  }

  return {
    impact: (style = "medium", target) => fireEvent(style, target),
    notification: (type, target) => fireEvent(type, target),
    selection: (target) => fireEvent("selection", target),
    light: (target) => fireEvent("light", target),
    medium: (target) => fireEvent("medium", target),
    heavy: (target) => fireEvent("heavy", target),
    success: (target) => fireEvent("success", target),
    warning: (target) => fireEvent("warning", target),
    error: (target) => fireEvent("error", target),
    play: (input, target) => {
      if (typeof input === "number") {
        fire({ haptic: { steps: [{ duration: input, intensity: 1 }] } }, toTarget(target));
      } else if (Array.isArray(input)) {
        fire({ haptic: { steps: input } }, toTarget(target));
      } else {
        fireEvent(input, target);
      }
    },
    set: (next) => {
      if (next.events) events = resolveEvents({ ...config.events, ...next.events });
      if (next.haptics !== undefined) hapticsOn = next.haptics;
      if (next.strength !== undefined) strength = next.strength;
      if (next.volume !== undefined) volume = next.volume;
      if (next.scale !== undefined) scale = next.scale;
      if (next.sound !== undefined) enableSound(next.sound);
      if (next.motion !== undefined) enableMotion(next.motion);
    },
    diagnose: () => buildReport(),
    test: async () => {
      for (const name of PRESET_EVENTS) {
        fireEvent(name);
        if (debug) console.log(`[tactile] ${name}`);
        await new Promise((r) => setTimeout(r, 500));
      }
    },
  };
}

function toTarget(target?: Targetish): MotionTarget {
  if (!target || typeof window === "undefined") return {};
  if (target instanceof Element) return { el: target };
  if ("clientX" in target && "clientY" in target) {
    const ev = target;
    const el =
      ev.currentTarget instanceof Element
        ? ev.currentTarget
        : ev.target instanceof Element
          ? ev.target
          : null;
    return { el, x: ev.clientX, y: ev.clientY };
  }
  return target;
}

function buildNotes(
  platform: Platform,
  probe: BackendProbe,
  hapticsOn: boolean,
  soundName: string | false,
  motionName: string | false,
): string[] {
  const notes: string[] = [];
  if (!hapticsOn) notes.push("Haptic channel off.");
  if (platform.desktop)
    notes.push("Desktop has no vibration motor — sound + motion carry the feedback here.");
  if (platform.android) {
    notes.push(
      probe.vibrate?.exists
        ? "Android: navigator.vibrate is available. If a call returns true but you feel nothing, the OS vibration / touch-feedback setting or battery saver is off — not the app."
        : "Android: navigator.vibrate is missing in this engine.",
    );
  }
  if (platform.ios) {
    notes.push(
      probe.iosSwitch?.available
        ? "iOS: invisible-switch Taptic tick (one light tick per call). iOS 26.5 patched the script path; silence on ≥26.5 is the platform, not the app."
        : "iOS: switch-based haptics unavailable on this WebKit version.",
    );
  }
  notes.push(soundName ? `Sound channel: "${soundName}".` : "Sound channel off.");
  notes.push(motionName ? `Motion channel: "${motionName}".` : "Motion channel off.");
  if (platform.standalonePWA) notes.push("Running as an installed PWA.");
  return notes;
}
