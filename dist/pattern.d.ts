import type { HapticStep } from "./types.js";
/**
 * Converts recipe steps to the pattern expected by `navigator.vibrate`. The result
 * always starts with an on-value and alternates on and off.
 *
 * The web has no amplitude control, so `intensity` uses PWM: each scaled on-time is
 * chopped into windows whose duty cycle equals the step's intensity. Full intensity
 * becomes one solid pulse. `PWM_PERIOD_MS` is 20 ms, raised from 10. At 10 ms, a
 * 0.5 duty gave an Android LRA motor only 5 ms to move. At 20 ms, a 0.7 duty
 * gives 14 ms on, enough for partial response and perceptible roughness.
 *
 * `strength` scales each step's duration. `MAX_PWM_WINDOWS_PER_STEP` remains 64,
 * widening the window only beyond 1280 ms so each step stays bounded at 64 windows.
 */
export declare function stepsToPattern(steps: HapticStep[], strength?: number): number[];
//# sourceMappingURL=pattern.d.ts.map