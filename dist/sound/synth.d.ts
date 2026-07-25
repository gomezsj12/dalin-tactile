import type { SoundPack } from "../types.js";
/**
 * The palette. Thirteen cues back the default events; the other seven (chime,
 * sparkle, droplet, bloom, pop, swipe, whisper) are timbres you reach for
 * directly with `cue()` or wire into an event override.
 *
 * Pitches are equal-tempered so multi-note cues sit in tune with each other.
 */
declare const CUES: {
    tick: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
        };
        drift?: undefined;
    } | {
        wave: "triangle";
        freq: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
        };
    })[];
    tap: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
        };
        to?: undefined;
        drift?: undefined;
    } | {
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
        };
    })[];
    press: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
            to?: undefined;
        };
        to?: undefined;
        drift?: undefined;
    } | {
        wave: "triangle";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            to: number;
            type?: undefined;
            q?: undefined;
        };
    })[];
    release: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
        };
        to?: undefined;
        drift?: undefined;
    } | {
        wave: "triangle";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
        };
    })[];
    toggle: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
            to?: undefined;
        };
        drift?: undefined;
        at?: undefined;
    } | {
        wave: "square";
        freq: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            to: number;
            q: number;
            type?: undefined;
        };
        at?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
            to?: undefined;
        };
    })[];
    pop: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
        };
        to?: undefined;
        drift?: undefined;
    } | {
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            q: number;
            type?: undefined;
        };
    })[];
    whisper: {
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        attack: number;
        filter: {
            type: "highpass";
            f: number;
            q: number;
        };
    }[];
    chime: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "highpass";
            f: number;
        };
        partials?: undefined;
        drift?: undefined;
    } | {
        wave: "sine";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
        };
    })[];
    sparkle: ({
        wave: "sine";
        freq: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
        };
        at?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
        };
    })[];
    droplet: ({
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            q: number;
        };
        at?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
            q?: undefined;
        };
        drift?: undefined;
    })[];
    bloom: {
        wave: "triangle";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        attack: number;
        drift: number;
        filter: {
            f: number;
            to: number;
        };
    }[];
    swipe: {
        wave: "noise";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        attack: number;
    }[];
    success: ({
        wave: "sine";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
        };
        at?: undefined;
        attack?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
        };
        attack?: undefined;
    } | {
        at: number;
        wave: "triangle";
        freq: number;
        dur: number;
        gain: number;
        attack: number;
        filter: {
            f: number;
        };
        partials?: undefined;
        drift?: undefined;
    })[];
    ready: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "highpass";
            f: number;
        };
        partials?: undefined;
        drift?: undefined;
    } | {
        wave: "sine";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        drift: number;
        filter: {
            f: number;
            type?: undefined;
        };
    })[];
    loading: ({
        wave: "sine";
        freq: number;
        dur: number;
        gain: number;
        attack: number;
        filter: {
            f: number;
        };
        at?: undefined;
        drift?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        dur: number;
        gain: number;
        attack: number;
        drift: number;
        filter: {
            f: number;
        };
    })[];
    page: ({
        wave: "noise";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        attack: number;
        at?: undefined;
        filter?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
        };
        attack?: undefined;
    })[];
    warning: ({
        wave: "triangle";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        filter: {
            f: number;
            q: number;
        };
        at?: undefined;
    } | {
        at: number;
        wave: "triangle";
        freq: number;
        partials: number[];
        dur: number;
        gain: number;
        filter: {
            f: number;
            q: number;
        };
    })[];
    error: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
            to?: undefined;
        };
        at?: undefined;
        to?: undefined;
    } | {
        wave: "sawtooth";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
            to: number;
            q: number;
            type?: undefined;
        };
        at?: undefined;
        to?: undefined;
    } | {
        at: number;
        wave: "sawtooth";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
            to: number;
            q: number;
            type?: undefined;
        };
    })[];
    thud: ({
        wave: "noise";
        freq: number;
        dur: number;
        gain: number;
        filter: {
            type: "bandpass";
            f: number;
            q: number;
        };
        to?: undefined;
        at?: undefined;
    } | {
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
        };
        at?: undefined;
    } | {
        at: number;
        wave: "sine";
        freq: number;
        to: number;
        dur: number;
        gain: number;
        filter: {
            f: number;
            type?: undefined;
            q?: undefined;
        };
    })[];
    buzz: {
        wave: "sawtooth";
        freq: number;
        dur: number;
        gain: number;
        sustain: true;
        tremolo: number;
    }[];
};
/** Cue names the built-in pack exposes. */
export type SynthCue = keyof typeof CUES;
/** The built-in cue names, in palette order. Useful for building a picker UI. */
export declare const SYNTH_CUES: SynthCue[];
export declare const synthPack: SoundPack;
export default synthPack;
//# sourceMappingURL=synth.d.ts.map