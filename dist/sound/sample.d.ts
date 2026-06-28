import type { SoundPack } from "../types.js";
/**
 * A sample-based sound pack — plays real audio files (e.g. curated CC0 sounds).
 *
 * This is the "realness" upgrade over the synth pack. Supply a manifest mapping
 * cue names to file URLs; the pack fetches + decodes them once, then plays them
 * on demand. Files are NOT bundled — you point at a folder you control (drop in
 * CC0 samples from freesound.org or Kenney.nl), keeping the package asset-free.
 *
 *   createTactile({
 *     sound: createSamplePack({
 *       baseUrl: "/sounds/",
 *       cues: { tick: "tick.wav", tap: "tap.wav", success: "success.wav" },
 *     }),
 *   });
 */
export interface SampleManifest {
    name?: string;
    /** Prepended to every cue file (e.g. "/sounds/"). */
    baseUrl?: string;
    /** cue name → audio file (url or path). */
    cues: Record<string, string>;
}
export declare function createSamplePack(manifest: SampleManifest): SoundPack;
//# sourceMappingURL=sample.d.ts.map