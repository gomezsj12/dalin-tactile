const PWM_PERIOD_MS = 10;
const MAX_PWM_WINDOWS_PER_STEP = 64;
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
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
export function stepsToPattern(steps, strength = 1) {
    const segs = [];
    const add = (on, ms) => {
        if (ms <= 0)
            return;
        const last = segs[segs.length - 1];
        if (last && last.on === on)
            last.ms += ms; // coalesce same-type runs
        else
            segs.push({ on, ms });
    };
    for (const step of steps) {
        if (step.delay && step.delay > 0)
            add(false, step.delay);
        const dur = Math.round((step.duration ?? 0) * strength);
        if (dur <= 0)
            continue;
        const intensity = clamp01(step.intensity ?? 1);
        if (intensity >= 0.999) {
            add(true, dur);
            continue;
        }
        if (intensity <= 0.001) {
            add(false, dur);
            continue;
        }
        // Long fractional steps widen the PWM carrier so custom buzzes do not expand
        // into huge `navigator.vibrate` arrays while keeping roughly the same duty cycle.
        const pwmPeriod = Math.max(PWM_PERIOD_MS, Math.ceil(dur / MAX_PWM_WINDOWS_PER_STEP));
        let remaining = dur;
        while (remaining > 0.5) {
            const w = Math.min(pwmPeriod, remaining);
            const on = Math.max(1, Math.round(w * intensity));
            add(true, on);
            add(false, Math.round(w - on));
            remaining -= w;
        }
    }
    while (segs.length > 0 && !segs[segs.length - 1].on)
        segs.pop(); // drop trailing silence
    if (segs.length === 0)
        return [];
    const pattern = [];
    if (!segs[0].on)
        pattern.push(0); // lead with a 0-length on so on/off parity holds
    for (const s of segs)
        pattern.push(Math.round(s.ms));
    return pattern;
}
//# sourceMappingURL=pattern.js.map