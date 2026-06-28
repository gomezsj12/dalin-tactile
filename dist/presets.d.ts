import type { EventName, EventOverrides, EventTable } from "./types.js";
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
export declare const DEFAULT_EVENTS: EventTable;
declare const EVENT_NAMES: EventName[];
/**
 * Merge overrides onto the defaults, producing a fresh, fully-populated table.
 *
 * AUDIT-014 (Low): merge is PER CHANNEL, not per field — an override's `haptic`/`sound`/
 * `motion` replaces the whole channel recipe (you can't tweak just `motion.count`). The
 * README's "override just what you want" reads field-level; clarify the wording. code-audit.md.
 */
export declare function resolveEvents(overrides?: EventOverrides): EventTable;
export { EVENT_NAMES as PRESET_EVENTS };
//# sourceMappingURL=presets.d.ts.map