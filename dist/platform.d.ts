/** Coarse platform detection for routing haptics and building diagnostics. */
export interface Platform {
    ios: boolean;
    android: boolean;
    desktop: boolean;
    standalonePWA: boolean;
}
export declare function detectPlatform(): Platform;
//# sourceMappingURL=platform.d.ts.map