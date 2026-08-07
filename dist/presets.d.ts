import type { EventName, EventOverrides, EventTable } from "./types.js";
/**
 * DEFAULT_EVENTS maps each semantic event across three channels. Haptics produce a
 * vibration pattern. Sound supplies a cue name for the SoundPack to resolve. Motion
 * drives on-screen effects, and every event includes emoji so a tap always shows
 * something. Override any channel via `createTactile({ events: {...} })`.
 *
 * Use `strength` as the global duration multiplier for every step. Within a haptic
 * recipe, write a continuous rough run as one step with `intensity` below 1. Write a
 * small number of separate events as steps with `delay` between them. A chopped
 * step ends with an off-window; when a delay follows, that off-window merges into
 * the delay, so the emitted gap is a few milliseconds longer than the delay in the
 * source.
 *
 * Design rungs in this order: start with texture, use rhythm next, then use coarse
 * weight only as a tiebreaker. Roughness and smoothness survive the motor better
 * than fine duration changes; an airy feel does too.
 *
 * Rhythm separates a single event from repeated events. It also distinguishes a
 * rising sequence from one that stays even or falls. A ladder of smooth pulses at
 * 25 ms, 40 ms, 60 ms, or 100 ms feels like one haptic at four volumes.
 *
 * Tune pairs that users feel in sequence during real use. Array values can look
 * widely separated while feeling identical; the old light half of this ladder did
 * on Android hardware.
 */
export declare const DEFAULT_EVENTS: EventTable;
declare const EVENT_NAMES: EventName[];
/**
 * Merge overrides onto the defaults, producing a fresh, fully-populated table.
 *
 * AUDIT-014 (Low): merge is PER CHANNEL, not per field: an override's `haptic`/`sound`/
 * `motion` replaces the whole channel recipe (you can't tweak just `motion.count`). The
 * README's "override just what you want" reads field-level; clarify the wording. code-audit.md.
 */
export declare function resolveEvents(overrides?: EventOverrides): EventTable;
export { EVENT_NAMES as PRESET_EVENTS };
//# sourceMappingURL=presets.d.ts.map