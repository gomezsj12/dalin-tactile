/**
 * @dalin/tactile — one call, three coordinated channels.
 *
 * createTactile() returns an object whose semantic methods (success, selection,
 * impact, …) fire every ENABLED channel together: a haptic (Android vibrate +
 * iOS switch tick), a sound (Web Audio), and motion (emoji burst / boop).
 * Choose haptics, sound, motion, or any combination.
 *
 * The haptic backend is a swap seam: pure-web today, native (Capacitor) later
 * behind the same surface. See ROADMAP.md and docs/DEFERRED.md. (AUDIT-016: this
 * comment previously pointed at a cross-repo path; repointed to local docs.)
 */
import type { Tactile, TactileConfig } from "./types.js";
export type { Tactile, TactileConfig, TactileReport, ChannelConfig, EventName, EventRecipe, EventOverrides, HapticStep, HapticRecipe, BackendKind, HapticBackend, BackendProbe, SoundPack, SoundChannel, MotionDriver, MotionSpec, MotionTarget, MotionRuntime, Targetish, } from "./types.js";
export declare function createTactile(config?: TactileConfig): Tactile;
//# sourceMappingURL=index.d.ts.map