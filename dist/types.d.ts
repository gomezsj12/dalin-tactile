/**
 * @dalin/tactile — make web interactions feel real.
 *
 * One semantic event (success, selection, press, …) fires up to THREE
 * independent channels in concert:
 *   • haptic — vibration / iOS Taptic (tunable PWM)
 *   • sound  — Web Audio (built-in synth pack, or a CC0 sample pack)
 *   • motion — on-screen feedback (emoji/particle burst, springy "boop")
 *
 * Every channel is independently on/off and tunable: haptics only, sound only,
 * the works. Motion auto-respects `prefers-reduced-motion`.
 *
 * The haptic surface is Capacitor / iOS `UIFeedbackGenerator` shaped, so a
 * native backend can slot in later without changing call sites.
 */
export type EventName = "selection" | "light" | "medium" | "heavy" | "success" | "warning" | "error" | "buzz";
export interface HapticStep {
    /** Motor-on time, ms. */
    duration?: number;
    /** Silent lead-in, ms. */
    delay?: number;
    /** 0..1 strength — PWM-approximated on web, impact weight on native. */
    intensity?: number;
}
/** What the haptic backend fires. */
export interface HapticRecipe {
    steps: HapticStep[];
    /** Intended weight on iOS / native, where only a discrete tick exists. */
    ios?: "light" | "medium" | "heavy";
}
export type BackendKind = "web" | "native" | "silent";
/** A haptic backend turns a recipe into device feedback. The swap seam. */
export interface HapticBackend {
    readonly kind: BackendKind;
    fire(recipe: HapticRecipe, strength: number): void;
    cancel(): void;
    probe(): BackendProbe;
}
export interface BackendProbe {
    kind: BackendKind;
    vibrate?: {
        exists: boolean;
        lastReturn: boolean | null;
    };
    iosSwitch?: {
        available: boolean;
    };
}
/** A sound pack: a named factory for a SoundChannel. Imported separately from core. */
export interface SoundPack {
    readonly name: string;
    create(ctx: AudioContext): SoundChannel | Promise<SoundChannel>;
}
export interface SoundChannel {
    readonly name: string;
    play(cue: string, opts?: {
        volume?: number;
    }): void;
    readonly cues: readonly string[];
}
/** Where an on-screen effect originates. */
export interface MotionTarget {
    /** Anchor element (boop, element-anchored bursts). */
    el?: Element | null;
    /** Viewport point (particle bursts); falls back to the element centre. */
    x?: number;
    y?: number;
}
/** What an event draws on screen. A recipe picks one primary effect. */
export type MotionSpec = {
    kind: "none";
} | {
    kind: "boop";
    scale?: number;
    rotate?: number;
    x?: number;
    y?: number;
    timing?: number;
} | {
    kind: "particles";
    emojis?: string[];
    /** Randomly mirror some emoji for variety. */
    flip?: boolean;
    /** Particles per burst (default ~5). */
    count?: number;
    /** If set, keep spawning bursts for this many ms — a sustained "shower". */
    duration?: number;
    gravityX?: number;
    gravityY?: number;
} | {
    kind: "custom";
    play: (target: MotionTarget, runtime: MotionRuntime) => void;
};
/** Runtime context handed to a motion driver. */
export interface MotionRuntime {
    reducedMotion: boolean;
    scale: number;
}
/**
 * A motion driver renders a MotionSpec. The built-in driver is dependency-free;
 * heavier ones (tsParticles, react-rewards) can be supplied here behind the same
 * interface — the "wrap only when needed" half of the hybrid plan.
 */
export interface MotionDriver {
    readonly name: string;
    render(spec: MotionSpec, target: MotionTarget, runtime: MotionRuntime): void;
}
export interface EventRecipe {
    haptic?: HapticRecipe;
    /** Cue name resolved in the active SoundPack. */
    sound?: string;
    /** One effect, or several fired together (e.g. a boop + a particle burst). */
    motion?: MotionSpec | MotionSpec[];
}
export type EventTable = Record<EventName, EventRecipe>;
export type EventOverrides = Partial<{
    [K in EventName]: Partial<EventRecipe>;
}>;
export interface ChannelConfig {
    /** Vibration / Taptic. Default: true. */
    haptics?: boolean;
    /** Sound. `false` | `true` (built-in synth) | a `SoundPack`. Default: false. */
    sound?: boolean | SoundPack;
    /** Motion. `false` | `true` (built-in dependency-free driver) | a `MotionDriver`. Default: false. */
    motion?: boolean | MotionDriver;
}
export interface TactileConfig extends ChannelConfig {
    /** Tune any event across channels without redefining the whole table. */
    events?: EventOverrides;
    /** Global haptic strength multiplier (0..1+). */
    strength?: number;
    /** Default sound volume (0..1). */
    volume?: number;
    /** Global motion scale. */
    scale?: number;
    /** Backend choice. `"auto"` = native if wired, else web. (`"native"` deferred.) */
    backend?: "auto" | "web" | "silent";
    debug?: boolean;
}
export interface TactileReport {
    backend: BackendKind;
    channels: {
        haptics: boolean;
        sound: string | false;
        motion: string | false;
    };
    platform: {
        ios: boolean;
        android: boolean;
        desktop: boolean;
        standalonePWA: boolean;
    };
    vibrate: {
        exists: boolean;
        lastReturn: boolean | null;
    };
    iosSwitch: {
        available: boolean;
    };
    audio: {
        enabled: boolean;
        state: AudioContextState | "absent";
    };
    reducedMotion: boolean;
    notes: string[];
}
/** A target for the motion channel: an element, a pointer event, or an explicit point. */
export type Targetish = MotionTarget | Element | MouseEvent;
/** The object `createTactile()` returns. Semantic methods fire every enabled channel. */
export interface Tactile {
    impact(style?: "light" | "medium" | "heavy", target?: Targetish): void;
    notification(type: "success" | "warning" | "error", target?: Targetish): void;
    selection(target?: Targetish): void;
    light(target?: Targetish): void;
    medium(target?: Targetish): void;
    heavy(target?: Targetish): void;
    success(target?: Targetish): void;
    warning(target?: Targetish): void;
    error(target?: Targetish): void;
    /** A rapid rattle of ticks — a playful "buzz" of feedback. */
    buzz(target?: Targetish): void;
    /** Fire an event by name, or raw haptic input, with an optional motion target. */
    play(input: EventName | HapticStep[] | number, target?: Targetish): void;
    /** Re-tune or toggle channels at runtime (e.g. a settings screen). */
    set(config: Partial<TactileConfig>): void;
    diagnose(): TactileReport;
    /** Fire every event in sequence with gaps, logging each — for on-device tuning. */
    test(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map