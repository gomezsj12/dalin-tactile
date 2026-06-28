export function detectPlatform() {
    if (typeof navigator === "undefined") {
        return { ios: false, android: false, desktop: true, standalonePWA: false };
    }
    const ua = navigator.userAgent || "";
    const hasTouch = typeof document !== "undefined" && "ontouchend" in document;
    // iPadOS 13+ reports a Mac UA — disambiguate by touch support.
    const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && hasTouch);
    const android = /Android/.test(ua);
    const standaloneMedia = typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = navigator.standalone === true;
    return {
        ios,
        android,
        desktop: !ios && !android,
        standalonePWA: standaloneMedia || iosStandalone,
    };
}
//# sourceMappingURL=platform.js.map