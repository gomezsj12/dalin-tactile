import type { SoundChannel, SoundPack } from "../types.js";

/**
 * Built-in synthesized sound pack — zero asset weight, generated with Web Audio.
 * Short, soft UI cues meant to PAIR with a haptic (or stand in when the device
 * can't vibrate). This is the `sound: true` default; it's lazy-loaded so a
 * haptics-only build never includes it.
 *
 * Every cue is a tiny oscillator + gain envelope. Tune freely, or supply a
 * sample-based pack (e.g. curated CC0 sounds) via `createTactile({ sound: pack })`.
 */

type CueSpec = {
  type: OscillatorType;
  freq: number;
  /** Optional end frequency for a quick pitch sweep. */
  to?: number;
  /** Length, seconds. */
  dur: number;
  /** Peak gain, 0..1. */
  gain: number;
  /** Lead-in gap before this note, seconds (lets multi-stage cues breathe). */
  delay?: number;
};

const CUES: Record<string, CueSpec[]> = {
  tick: [{ type: "triangle", freq: 2200, dur: 0.025, gain: 0.16 }],
  tap: [{ type: "sine", freq: 880, to: 660, dur: 0.05, gain: 0.22 }],
  thud: [
    { type: "triangle", freq: 1100, dur: 0.018, gain: 0.16 }, // snap attack
    { type: "sine", freq: 165, to: 72, dur: 0.11, gain: 0.5, delay: 0.004 }, // boom 1
    { type: "sine", freq: 110, to: 42, dur: 0.22, gain: 0.62, delay: 0.05 }, // boom 2 — deeper, longer
  ],
  success: [
    { type: "sine", freq: 660, dur: 0.06, gain: 0.2 },
    { type: "sine", freq: 990, dur: 0.09, gain: 0.2 },
  ],
  warning: [
    { type: "triangle", freq: 440, dur: 0.07, gain: 0.24 },
    { type: "triangle", freq: 440, dur: 0.07, gain: 0.24 },
  ],
  error: [
    { type: "square", freq: 392, dur: 0.09, gain: 0.16 }, // harsh "denied"…
    { type: "square", freq: 262, to: 247, dur: 0.18, gain: 0.2, delay: 0.05 }, // …descending, dying
  ],
};

export const synthPack: SoundPack = {
  name: "synth",
  create(ctx: AudioContext): SoundChannel {
    const master = ctx.createGain();
    master.gain.value = 1.6; // a touch hotter — phone speakers are quiet
    master.connect(ctx.destination);

    function playSpec(spec: CueSpec, at: number, volume: number): number {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, at);
      if (spec.to && spec.to !== spec.freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), at + spec.dur);
      }
      const peak = Math.max(0.0001, spec.gain * volume);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.004); // fast attack
      gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.dur); // smooth decay
      osc.connect(gain).connect(master);
      osc.start(at);
      osc.stop(at + spec.dur + 0.02);
      return at + spec.dur;
    }

    return {
      name: "synth",
      cues: Object.keys(CUES),
      play(cue: string, opts?: { volume?: number }): void {
        const specs = CUES[cue];
        if (!specs) return;
        const volume = opts?.volume ?? 1;
        let at = ctx.currentTime;
        for (const spec of specs) {
          at += spec.delay ?? 0;
          at = playSpec(spec, at, volume) + 0.01;
        }
      },
    };
  },
};

export default synthPack;
