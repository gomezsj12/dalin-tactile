import { stepsToPattern } from "../pattern.js";
import { detectPlatform } from "../platform.js";
import { iosSwitchAvailable, iosTick } from "../ios-switch.js";
/** The pure-web haptic backend: Android `navigator.vibrate` + the iOS switch tick. */
export function createWebBackend() {
    const platform = detectPlatform();
    const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
    let lastReturn = null;
    return {
        kind: "web",
        fire(recipe, strength) {
            if (platform.ios) {
                // iOS has no Vibration API: every recipe, including sustained `buzz`,
                // maps to one discrete Taptic tick. Sound + motion carry longer durations.
                iosTick(); // iOS has no Vibration API — one Taptic tick via the switch
                return;
            }
            if (!canVibrate)
                return;
            const pattern = stepsToPattern(recipe.steps, strength);
            if (pattern.length === 0)
                return;
            try {
                lastReturn = navigator.vibrate(pattern);
            }
            catch {
                lastReturn = null;
            }
        },
        cancel() {
            if (!canVibrate)
                return;
            try {
                navigator.vibrate(0); // supersede any in-flight pattern
            }
            catch {
                /* ignore */
            }
        },
        probe() {
            return {
                kind: "web",
                vibrate: { exists: canVibrate, lastReturn },
                iosSwitch: { available: iosSwitchAvailable() },
            };
        },
    };
}
//# sourceMappingURL=web.js.map