/**
 * Sound channel entry point (`@dalin/tactile/sound`).
 *
 * - `synthPack`        the built-in, zero-asset synthesized pack (the default).
 * - `SYNTH_CUES`       its 20 cue names, for building a picker or a settings UI.
 * - `SynthCue`         the matching union type.
 * - `createSamplePack` builds a pack from real audio files (curated CC0 samples).
 */
export { synthPack, SYNTH_CUES } from "./synth.js";
export type { SynthCue } from "./synth.js";
export { createSamplePack } from "./sample.js";
export type { SampleManifest } from "./sample.js";
//# sourceMappingURL=index.d.ts.map