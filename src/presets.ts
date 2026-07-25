import type { EventName, EventOverrides, EventRecipe, EventTable } from "./types.js";

/**
 * Default event recipes. Each maps a semantic event onto up to three channels.
 * Override any field via `createTactile({ events: {...} })`.
 *
 *   haptic → vibrate pattern. Strength is a blend of PWM `intensity` (0..1, the
 *            duty cycle, perceptible on devices that honour it) AND `duration`.
 *            The spread is deliberately EXTREME so the steps feel very different:
 *            a 10ms / 0.18 whisper for selection up to a 100+180ms / 1.0
 *            double-thud for heavy. `strength` scales it globally.
 *   sound  → cue name the SoundPack resolves.
 *   motion → on-screen effect(s): a canvas emoji burst (+ a boop on impacts).
 *            Every event has emoji so a tap always shows something.
 */
export const DEFAULT_EVENTS: EventTable = {
  selection: {
    haptic: { steps: [{ duration: 14, intensity: 0.5 }], ios: "light" },
    sound: "tick",
    motion: { kind: "particles", emojis: ["✨"], count: 3 },
  },
  press: {
    // Scale BELOW 1: the element goes in, which is the whole point of a press.
    haptic: { steps: [{ duration: 18, intensity: 0.6 }], ios: "light" },
    sound: "press",
    motion: { kind: "boop", scale: 0.94, timing: 160 },
  },
  release: {
    haptic: { steps: [{ duration: 9, intensity: 0.35 }], ios: "light" },
    sound: "release",
    motion: { kind: "boop", scale: 1.05, timing: 220 },
  },
  toggle: {
    haptic: { steps: [{ duration: 24, intensity: 0.7 }], ios: "light" },
    sound: "toggle",
    motion: [
      { kind: "boop", scale: 1.1 },
      { kind: "particles", emojis: ["🔘", "✨"], count: 3, flip: true },
    ],
  },
  light: {
    haptic: { steps: [{ duration: 28, intensity: 0.65 }], ios: "light" },
    sound: "tap",
    motion: { kind: "particles", emojis: ["✨", "👆"], count: 4, flip: true },
  },
  medium: {
    haptic: { steps: [{ duration: 70, intensity: 1 }], ios: "medium" },
    // The impact ladder is audible as well as felt: tap, then press, then thud.
    sound: "press",
    motion: [
      { kind: "boop", scale: 1.12 },
      { kind: "particles", emojis: ["👍", "✨"], count: 5, flip: true },
    ],
  },
  heavy: {
    haptic: {
      steps: [
        { duration: 100, intensity: 1 },
        { delay: 55, duration: 180, intensity: 1 },
      ],
      ios: "heavy",
    },
    sound: "thud",
    motion: [
      { kind: "boop", scale: 1.24 },
      { kind: "particles", emojis: ["💥", "🔥", "⭐️"], count: 8, flip: true },
    ],
  },
  success: {
    haptic: {
      steps: [
        { duration: 25, intensity: 0.5 },
        { delay: 55, duration: 60, intensity: 0.95 },
      ],
      ios: "medium",
    },
    sound: "success",
    motion: {
      kind: "particles",
      emojis: ["🎉", "✅", "⭐️", "💛", "🥳"],
      count: 6,
      duration: 600, // sustained shower
      flip: true,
    },
  },
  warning: {
    haptic: {
      steps: [
        { duration: 55, intensity: 0.75 },
        { delay: 75, duration: 55, intensity: 0.75 },
      ],
      ios: "medium",
    },
    sound: "warning",
    motion: { kind: "particles", emojis: ["⚠️", "😬", "👀"], count: 5, flip: true },
  },
  error: {
    haptic: {
      steps: [
        { duration: 90, intensity: 1 },
        { delay: 45, duration: 90, intensity: 1 },
        { delay: 45, duration: 90, intensity: 1 },
      ],
      ios: "heavy",
    },
    sound: "error",
    motion: { kind: "particles", emojis: ["⛔️", "🚫", "💢"], count: 6 },
  },
  loading: {
    // Two soft ticks spaced like a heartbeat: something is happening, nothing is done.
    haptic: {
      steps: [
        { duration: 12, intensity: 0.4 },
        { delay: 160, duration: 12, intensity: 0.4 },
      ],
      ios: "light",
    },
    sound: "loading",
    motion: { kind: "particles", emojis: ["⏳", "💭"], count: 3, flip: true },
  },
  ready: {
    haptic: {
      steps: [
        { duration: 20, intensity: 0.55 },
        { delay: 45, duration: 45, intensity: 0.9 },
      ],
      ios: "medium",
    },
    sound: "ready",
    motion: [
      { kind: "boop", scale: 1.14 },
      { kind: "particles", emojis: ["🟢", "✨", "👌"], count: 5, flip: true },
    ],
  },
  buzz: {
    // Sustained on Android haptics, sound, and motion. iOS haptics remain one tick.
    haptic: {
      steps: [{ duration: 2500, intensity: 1 }], // Android: one long, steady vibration
      ios: "light",
    },
    sound: "buzz", // sustained buzzing tone (~2.5s), see the synth pack
    motion: {
      kind: "particles",
      emojis: ["📳", "🐝", "💫", "✨"],
      count: 6,
      duration: 2500, // keep the emoji shower going for the whole buzz
      flip: true,
    },
  },
};

const EVENT_NAMES = Object.keys(DEFAULT_EVENTS) as EventName[];

function cloneRecipe(r: EventRecipe): EventRecipe {
  return {
    haptic: r.haptic ? { steps: r.haptic.steps.map((s) => ({ ...s })), ios: r.haptic.ios } : undefined,
    sound: r.sound,
    motion: Array.isArray(r.motion)
      ? r.motion.map((m) => ({ ...m }))
      : r.motion
        ? { ...r.motion }
        : undefined,
  };
}

/**
 * Merge overrides onto the defaults, producing a fresh, fully-populated table.
 *
 * AUDIT-014 (Low): merge is PER CHANNEL, not per field: an override's `haptic`/`sound`/
 * `motion` replaces the whole channel recipe (you can't tweak just `motion.count`). The
 * README's "override just what you want" reads field-level; clarify the wording. code-audit.md.
 */
export function resolveEvents(overrides?: EventOverrides): EventTable {
  const out = {} as EventTable;
  for (const name of EVENT_NAMES) {
    const base = cloneRecipe(DEFAULT_EVENTS[name]!);
    const ov = overrides?.[name];
    out[name] = ov
      ? { haptic: ov.haptic ?? base.haptic, sound: ov.sound ?? base.sound, motion: ov.motion ?? base.motion }
      : base;
  }
  return out;
}

export { EVENT_NAMES as PRESET_EVENTS };
