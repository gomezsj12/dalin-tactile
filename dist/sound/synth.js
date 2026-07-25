/**
 * The palette. Thirteen cues back the default events; the other seven (chime,
 * sparkle, droplet, bloom, pop, swipe, whisper) are timbres you reach for
 * directly with `cue()` or wire into an event override.
 *
 * Pitches are equal-tempered so multi-note cues sit in tune with each other.
 */
const CUES = {
    /* ── transients: clicks, the workhorses ──────────────────────────────── */
    // The lightest possible mark: a filtered noise "tk" with a whisper of tone
    // under it so it survives a tinny speaker.
    tick: [
        { wave: "noise", freq: 5200, dur: 0.012, gain: 0.4, filter: { type: "bandpass", f: 5200, q: 1.8 } },
        { wave: "triangle", freq: 3136, dur: 0.018, gain: 0.09, drift: 45, filter: { f: 6000 } },
    ],
    // A soft fingertip click: noise attack layered over a short falling body.
    tap: [
        { wave: "noise", freq: 2400, dur: 0.016, gain: 0.3, filter: { type: "bandpass", f: 2400, q: 1.2 } },
        { wave: "sine", freq: 760, to: 520, dur: 0.055, gain: 0.26, drift: 30, filter: { f: 3000 } },
    ],
    // Going IN: darker, weightier, with the cutoff closing as it settles.
    press: [
        { wave: "noise", freq: 1600, dur: 0.014, gain: 0.26, filter: { type: "bandpass", f: 1600, q: 1 } },
        { wave: "triangle", freq: 540, to: 360, dur: 0.07, gain: 0.35, drift: 25, filter: { f: 2200, to: 900 } },
    ],
    // Coming UP: the complement of press, shorter and rising. The pair reads as
    // one physical button rather than two unrelated clicks.
    release: [
        { wave: "noise", freq: 3000, dur: 0.01, gain: 0.2, filter: { type: "bandpass", f: 3000, q: 1.4 } },
        { wave: "triangle", freq: 420, to: 620, dur: 0.045, gain: 0.22, drift: 25, filter: { f: 3200 } },
    ],
    // A detent: click, snap, then a small confirming step up.
    toggle: [
        { wave: "noise", freq: 2800, dur: 0.012, gain: 0.3, filter: { type: "bandpass", f: 2800, q: 1.6 } },
        { wave: "square", freq: 880, dur: 0.038, gain: 0.17, drift: 20, filter: { f: 2600, to: 1200, q: 1.2 } },
        { at: 0.045, wave: "sine", freq: 1174.66, dur: 0.05, gain: 0.16, drift: 20, filter: { f: 4000 } },
    ],
    // A bubble. The steep bend sweeping through a resonant cutoff is the whole trick.
    pop: [
        { wave: "noise", freq: 1200, dur: 0.008, gain: 0.16, filter: { type: "bandpass", f: 1200, q: 1 } },
        { wave: "sine", freq: 380, to: 1150, dur: 0.045, gain: 0.28, drift: 60, filter: { f: 1800, q: 6 } },
    ],
    // Hover-weight: air, no pitch, deliberately near the floor of audibility.
    whisper: [
        { wave: "noise", freq: 6000, dur: 0.09, gain: 0.075, attack: 0.02, filter: { type: "highpass", f: 3800, q: 0.7 } },
    ],
    /* ── tonal: chimes, glides, blooms ───────────────────────────────────── */
    // A struck bell: A5 with tubular-bell partials and a highpassed strike noise.
    chime: [
        { wave: "noise", freq: 7000, dur: 0.01, gain: 0.1, filter: { type: "highpass", f: 5000 } },
        { wave: "sine", freq: 880, partials: [2.76, 5.4], dur: 0.62, gain: 0.24, drift: 15, filter: { f: 5200 } },
    ],
    // Three glassy notes up a G major arpeggio, staggered 50ms apart.
    sparkle: [
        { wave: "sine", freq: 1567.98, dur: 0.1, gain: 0.24, drift: 25, filter: { f: 7000 } },
        { at: 0.05, wave: "sine", freq: 2093, dur: 0.11, gain: 0.21, drift: 25, filter: { f: 8000 } },
        { at: 0.1, wave: "sine", freq: 2637.02, dur: 0.16, gain: 0.18, drift: 25, filter: { f: 9000 } },
    ],
    // Water: a fast rising bend, then a short falling settle over its tail.
    droplet: [
        { wave: "sine", freq: 420, to: 1500, dur: 0.075, gain: 0.3, drift: 40, filter: { f: 2400, q: 5 } },
        { at: 0.06, wave: "sine", freq: 1500, to: 900, dur: 0.09, gain: 0.1, filter: { f: 3000 } },
    ],
    // Something opening: slow attack, a fifth and an octave, cutoff sweeping wide.
    bloom: [
        { wave: "triangle", freq: 329.63, partials: [1.5, 2], dur: 0.5, gain: 0.22, attack: 0.06, drift: 12, filter: { f: 500, to: 3200 } },
    ],
    // A directional whoosh. Noise with no explicit filter sweeps its own bandpass.
    // The gain looks high next to the tonal cues because a bandpass throws away
    // most of white noise's energy: measured output peak is about a quarter of it.
    swipe: [{ wave: "noise", freq: 400, to: 2600, dur: 0.17, gain: 0.95, attack: 0.03 }],
    /* ── semantic: the cues events reach for by default ──────────────────── */
    // G5 to D6, glockenspiel-ish, over a warm pad. Confident, not chirpy.
    success: [
        { wave: "sine", freq: 783.99, partials: [2, 3.01], dur: 0.16, gain: 0.28, drift: 12, filter: { f: 5000 } },
        { at: 0.085, wave: "sine", freq: 1174.66, partials: [2, 3.01], dur: 0.4, gain: 0.29, drift: 12, filter: { f: 5600 } },
        { at: 0.085, wave: "triangle", freq: 587.33, dur: 0.34, gain: 0.1, attack: 0.03, filter: { f: 1800 } },
    ],
    // One bright bell note. Shorter than success, so "done" and "available" differ.
    ready: [
        { wave: "noise", freq: 7000, dur: 0.008, gain: 0.09, filter: { type: "highpass", f: 5200 } },
        { wave: "sine", freq: 1046.5, partials: [2.76, 5.4], dur: 0.34, gain: 0.2, drift: 12, filter: { f: 6000 } },
    ],
    // Working: two soft same-pitch pulses. No resolution, because nothing resolved.
    loading: [
        { wave: "sine", freq: 523.25, dur: 0.13, gain: 0.16, attack: 0.03, filter: { f: 1600 } },
        { at: 0.17, wave: "sine", freq: 523.25, dur: 0.16, gain: 0.13, attack: 0.03, drift: 10, filter: { f: 1600 } },
    ],
    // Navigation: a whoosh with a low falling note landing under it.
    page: [
        { wave: "noise", freq: 900, to: 2200, dur: 0.14, gain: 0.34, attack: 0.025 },
        { at: 0.05, wave: "sine", freq: 392, to: 293.66, dur: 0.16, gain: 0.18, filter: { f: 1400 } },
    ],
    // Caution: two identical mid notes, resonant enough to cut through, no menace.
    warning: [
        { wave: "triangle", freq: 440, partials: [2], dur: 0.075, gain: 0.36, filter: { f: 2600, q: 1.4 } },
        { at: 0.135, wave: "triangle", freq: 440, partials: [2], dur: 0.085, gain: 0.36, filter: { f: 2600, q: 1.4 } },
    ],
    // Denied: a scuff, then two low sawtooth notes falling as their cutoff closes.
    // Sawtooth-through-a-closing-lowpass is what makes it read as refusal.
    error: [
        { wave: "noise", freq: 900, dur: 0.02, gain: 0.24, filter: { type: "bandpass", f: 900, q: 0.9 } },
        { wave: "sawtooth", freq: 233.08, dur: 0.1, gain: 0.22, filter: { f: 1500, to: 700, q: 2 } },
        { at: 0.11, wave: "sawtooth", freq: 174.61, to: 155.56, dur: 0.28, gain: 0.27, filter: { f: 1100, to: 380, q: 2.2 } },
    ],
    // Impact: a snap plus two genuinely simultaneous sub-bass booms. The soft clip
    // is what lets these stack this hot without squaring off.
    thud: [
        { wave: "noise", freq: 1500, dur: 0.018, gain: 0.24, filter: { type: "bandpass", f: 1500, q: 0.8 } },
        { wave: "sine", freq: 170, to: 68, dur: 0.15, gain: 0.5, filter: { f: 900 } },
        { at: 0.03, wave: "sine", freq: 104, to: 40, dur: 0.3, gain: 0.55, filter: { f: 600 } },
    ],
    // A sustained low sawtooth with a square tremolo, a continuous "bzzzz" for ~2.5s.
    // Deliberately UNFILTERED and with no partials, unlike every other cue here.
    // The rebuild tried a detuned octave under a 700 Hz lowpass to make it hum
    // rather than rasp; it sounded worse, so this is the original recipe restored
    // verbatim (120 Hz, gain 0.12, tremolo 28 Hz). The rasp is the point. Leave it.
    buzz: [{ wave: "sawtooth", freq: 120, dur: 2.5, gain: 0.12, sustain: true, tremolo: 28 }],
};
/** The built-in cue names, in palette order. Useful for building a picker UI. */
export const SYNTH_CUES = Object.keys(CUES);
/** Scheduling lead, seconds. Starting a ramp exactly at `currentTime` can glitch. */
const LEAD = 0.002;
/** Floor for exponential ramps, which can't touch zero. */
const SILENT = 0.0001;
export const synthPack = {
    name: "synth",
    create(ctx) {
        const master = ctx.createGain();
        master.gain.value = 1; // the summing bus and global trim point; makeup lives in the shaper
        // AUDIT-008 fix: a tanh soft-clip, and it is the LAST node before the
        // destination, so output is mathematically bounded to +/-1. Its slope at
        // zero is k/tanh(k), about 1.74, which replaces the old `master.gain = 1.6`
        // boost ("phone speakers are quiet") while giving progressively less gain as
        // peaks rise. Summed cues (a 2.5s buzz under rapid taps, thud's stacked
        // booms) round over instead of squaring off. A DynamicsCompressor would
        // also have worked, but its attack dulls exactly the transients these
        // clicks are built from.
        const shaper = ctx.createWaveShaper();
        const n = 1024;
        const curve = new Float32Array(n);
        const k = 1.6;
        const norm = Math.tanh(k);
        for (let i = 0; i < n; i++) {
            curve[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * k) / norm;
        }
        shaper.curve = curve;
        shaper.oversample = "2x"; // the nonlinearity aliases without it
        master.connect(shaper).connect(ctx.destination);
        // One second of noise, generated once per channel and read from a random
        // offset each time, so repeated clicks aren't bit-identical.
        let noise = null;
        function noiseBuffer() {
            if (!noise) {
                const len = Math.floor(ctx.sampleRate);
                noise = ctx.createBuffer(1, len, ctx.sampleRate);
                const data = noise.getChannelData(0);
                for (let i = 0; i < len; i++)
                    data[i] = Math.random() * 2 - 1;
            }
            return noise;
        }
        // AUDIT-019 (Low, acceptable): a voice costs 2 nodes at minimum and a cue
        // costs up to ~19 (success and thud are the heaviest), with no pooling and
        // no explicit disconnect. Nodes are GC'd once stopped, which is fine at UI
        // cadence. Revisit only if profiling shows GC pressure. docs/code-audit.md.
        function playVoice(v, at, volume) {
            const end = at + v.dur;
            const attack = v.attack ?? 0.003;
            const peak = Math.max(SILENT, Math.min(1, v.gain * volume));
            const env = ctx.createGain();
            env.gain.setValueAtTime(SILENT, at);
            env.gain.exponentialRampToValueAtTime(peak, at + attack);
            if (v.sustain)
                env.gain.setValueAtTime(peak, Math.max(at + attack, end - 0.05));
            env.gain.exponentialRampToValueAtTime(SILENT, end);
            // Envelope then filter then master. Both are linear, so the order between
            // them doesn't colour the result; this way one filter serves all partials.
            let sink = master;
            const fSpec = v.filter ?? (v.wave === "noise" ? { type: "bandpass", f: v.freq, to: v.to, q: 1.1 } : null);
            if (fSpec) {
                const filter = ctx.createBiquadFilter();
                filter.type = fSpec.type ?? "lowpass";
                filter.Q.value = fSpec.q ?? 1;
                filter.frequency.setValueAtTime(fSpec.f, at);
                if (fSpec.to !== undefined) {
                    filter.frequency.exponentialRampToValueAtTime(Math.max(20, fSpec.to), end);
                }
                filter.connect(master);
                sink = filter;
            }
            env.connect(sink);
            if (v.tremolo) {
                const lfo = ctx.createOscillator();
                const depth = ctx.createGain();
                lfo.type = "square";
                lfo.frequency.setValueAtTime(v.tremolo, at);
                depth.gain.setValueAtTime(peak * 0.85, at);
                depth.gain.setValueAtTime(peak * 0.85, Math.max(at + attack, end - 0.05));
                depth.gain.linearRampToValueAtTime(SILENT, end);
                lfo.connect(depth).connect(env.gain);
                lfo.start(at);
                lfo.stop(end + 0.02);
            }
            if (v.wave === "noise") {
                const src = ctx.createBufferSource();
                src.buffer = noiseBuffer();
                src.loop = true;
                src.connect(env);
                src.start(at, Math.random() * 0.9, v.dur + 0.02);
                return;
            }
            // Drift is picked once per voice so partials stay in tune with each other.
            const cents = v.drift ? (Math.random() * 2 - 1) * v.drift : 0;
            const bend = 2 ** (cents / 1200);
            const ratios = v.partials ? [1, ...v.partials] : [1];
            // Partials sit under the fundamental and the whole stack is normalized,
            // so `gain` means the same thing whether a voice has 1 layer or 4.
            const weights = ratios.map((_, i) => (i === 0 ? 1 : 0.45 / i));
            const total = weights.reduce((sum, w) => sum + w, 0);
            ratios.forEach((ratio, i) => {
                const osc = ctx.createOscillator();
                osc.type = v.wave;
                osc.frequency.setValueAtTime(v.freq * ratio * bend, at);
                if (v.to !== undefined) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.to * ratio * bend), end);
                }
                if (ratios.length === 1) {
                    osc.connect(env); // single layer: skip the mix gain entirely
                }
                else {
                    const mix = ctx.createGain();
                    mix.gain.value = (weights[i] ?? 1) / total;
                    osc.connect(mix).connect(env);
                }
                osc.start(at);
                osc.stop(end + 0.02);
            });
        }
        return {
            name: "synth",
            cues: SYNTH_CUES,
            play(cue, opts) {
                const voices = CUES[cue];
                if (!voices)
                    return;
                const volume = opts?.volume ?? 1;
                const onset = ctx.currentTime + LEAD;
                for (const v of voices)
                    playVoice(v, onset + (v.at ?? 0), volume);
            },
        };
    },
};
export default synthPack;
//# sourceMappingURL=synth.js.map