import type { HapticStep } from "./types.js";
/**
 * Flatten a step sequence into a `navigator.vibrate` pattern `[on, off, on, …]`.
 *
 * `navigator.vibrate` is binary on/off, so sub-full `intensity` is approximated
 * by PWM: a step's on-time is chopped into ~10 ms windows whose duty cycle equals
 * the intensity. Full intensity collapses to one solid pulse. `strength` is the
 * global magnitude knob — it scales each step's DURATION, the lever that actually
 * changes perceived power on the web (there is no amplitude control).
 * The returned pattern always begins with an on-value and alternates on/off.
 */
export declare function stepsToPattern(steps: HapticStep[], strength?: number): number[];
//# sourceMappingURL=pattern.d.ts.map