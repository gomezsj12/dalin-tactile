import type { SoundChannel, SoundPack } from "../types.js";

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

export function createSamplePack(manifest: SampleManifest): SoundPack {
  const name = manifest.name ?? "samples";
  return {
    name,
    async create(ctx: AudioContext): Promise<SoundChannel> {
      const base = manifest.baseUrl ?? "";
      const buffers = new Map<string, AudioBuffer>();
      const master = ctx.createGain();
      master.connect(ctx.destination);

      // Small UI sounds — decode them all up front. A missing/failed file just
      // leaves that cue silent rather than throwing.
      await Promise.all(
        Object.entries(manifest.cues).map(async ([cue, file]) => {
          try {
            const res = await fetch(base + file);
            if (!res.ok) return;
            const bytes = await res.arrayBuffer();
            buffers.set(cue, await ctx.decodeAudioData(bytes));
          } catch {
            /* cue stays silent */
          }
        }),
      );

      return {
        name,
        cues: [...buffers.keys()],
        play(cue: string, opts?: { volume?: number }): void {
          const buffer = buffers.get(cue);
          if (!buffer) return;
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const gain = ctx.createGain();
          gain.gain.value = opts?.volume ?? 1;
          src.connect(gain).connect(master);
          src.start();
        },
      };
    },
  };
}
