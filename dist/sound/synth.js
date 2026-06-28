const CUES = {
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
    // a sustained low sawtooth with a square tremolo → a continuous "bzzzz" for ~2.5s
    buzz: [{ type: "sawtooth", freq: 120, dur: 2.5, gain: 0.12, sustain: true, tremolo: 28 }],
};
export const synthPack = {
    name: "synth",
    create(ctx) {
        const master = ctx.createGain();
        master.gain.value = 1.6; // a touch hotter — phone speakers are quiet
        master.connect(ctx.destination);
        function playSpec(spec, at, volume) {
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
            if (spec.sustain) {
                gain.gain.setValueAtTime(peak, at + Math.max(0.004, spec.dur - 0.05)); // hold at peak
            }
            gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.dur); // decay / release
            osc.connect(gain).connect(master);
            // Optional tremolo: a square LFO added onto the gain → a pulsing buzz.
            if (spec.tremolo) {
                const lfo = ctx.createOscillator();
                const depth = ctx.createGain();
                lfo.type = "square";
                lfo.frequency.setValueAtTime(spec.tremolo, at);
                depth.gain.setValueAtTime(peak * 0.85, at);
                depth.gain.setValueAtTime(peak * 0.85, at + Math.max(0.004, spec.dur - 0.05));
                depth.gain.linearRampToValueAtTime(0.0001, at + spec.dur); // fade modulation at the tail
                lfo.connect(depth).connect(gain.gain);
                lfo.start(at);
                lfo.stop(at + spec.dur + 0.02);
            }
            osc.start(at);
            osc.stop(at + spec.dur + 0.02);
            return at + spec.dur;
        }
        return {
            name: "synth",
            cues: Object.keys(CUES),
            play(cue, opts) {
                const specs = CUES[cue];
                if (!specs)
                    return;
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
//# sourceMappingURL=synth.js.map