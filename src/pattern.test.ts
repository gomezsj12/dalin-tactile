import { describe, it, expect } from "vitest";
import { stepsToPattern } from "./pattern";

describe("stepsToPattern", () => {
  it("emits a solid pulse for full intensity (no PWM chopping)", () => {
    expect(stepsToPattern([{ duration: 70, intensity: 1 }])).toEqual([70]);
  });

  it("PWM-chops sub-full intensity into [on, off, …] with less on-time", () => {
    const p = stepsToPattern([{ duration: 20, intensity: 0.5 }]);
    expect(p.length).toBeGreaterThan(1);
    const onMs = p.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
    expect(onMs).toBeGreaterThan(0);
    expect(onMs).toBeLessThan(20); // duty < 100%
  });

  it("bounds long fractional-intensity PWM expansion", () => {
    const p = stepsToPattern([{ duration: 2500, intensity: 0.5 }]);
    const totalMs = p.reduce((a, b) => a + b, 0);
    const onMs = p.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);

    expect(p.length).toBeLessThanOrEqual(127);
    expect(totalMs).toBeGreaterThanOrEqual(2450);
    expect(totalMs).toBeLessThanOrEqual(2500);
    expect(onMs).toBeGreaterThanOrEqual(1200);
    expect(onMs).toBeLessThanOrEqual(1300);
  });

  it("scales on-durations by strength", () => {
    expect(stepsToPattern([{ duration: 50, intensity: 1 }], 2)).toEqual([100]);
    expect(stepsToPattern([{ duration: 50, intensity: 1 }], 0.5)).toEqual([25]);
  });

  it("encodes a leading delay as a 0ms on-pulse so on/off parity holds", () => {
    expect(stepsToPattern([{ delay: 30, duration: 40, intensity: 1 }])).toEqual([0, 30, 40]);
  });

  it("represents a multi-step pattern as [on, off, on, …]", () => {
    expect(
      stepsToPattern([
        { duration: 100, intensity: 1 },
        { delay: 55, duration: 180, intensity: 1 },
      ]),
    ).toEqual([100, 55, 180]); // the "heavy" double-thud
  });

  it("returns an empty pattern when there is no on-time", () => {
    expect(stepsToPattern([{ duration: 0, intensity: 1 }])).toEqual([]);
    expect(stepsToPattern([])).toEqual([]);
  });
});
