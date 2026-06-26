import type { EventName, EventOverrides, EventRecipe, EventTable } from "./types.js";

/**
 * Default event recipes — each maps a semantic event onto up to three channels.
 * Override any field via `createTactile({ events: {...} })`.
 *
 *   haptic → vibrate pattern. Strength is a blend of PWM `intensity` (0..1, the
 *            duty cycle — perceptible on devices that honour it) AND `duration`.
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
  light: {
    haptic: { steps: [{ duration: 28, intensity: 0.65 }], ios: "light" },
    sound: "tap",
    motion: { kind: "particles", emojis: ["✨", "👆"], count: 4, flip: true },
  },
  medium: {
    haptic: { steps: [{ duration: 70, intensity: 1 }], ios: "medium" },
    sound: "tap",
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

/** Merge overrides onto the defaults, producing a fresh, fully-populated table. */
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
