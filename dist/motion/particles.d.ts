/**
 * Canvas emoji-particle system for the motion channel.
 *
 * Physics + emoji rasterization adapted from lochie/web-haptics (MIT) — the same
 * engine behind haptics.lochie.me's emoji showers — ported to dependency-free
 * vanilla TS. A single shared full-screen canvas draws every particle; the rAF
 * loop runs ONLY while particles are alive and stops itself when idle. Emoji are
 * pre-rasterized to offscreen canvases for fast drawImage (cheap on iOS Safari).
 */
export interface BurstOptions {
    emojis?: string[];
    flip?: boolean;
    count?: number;
    /** If set, keep spawning bursts for this many ms (a sustained shower). */
    duration?: number;
    gravityX?: number;
    gravityY?: number;
}
/** Spawn an emoji burst at viewport point (x, y). A no-op outside the browser. */
export declare function particleBurst(x: number, y: number, opts?: BurstOptions): void;
//# sourceMappingURL=particles.d.ts.map