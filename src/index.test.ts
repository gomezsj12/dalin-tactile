import { afterEach, describe, expect, it, vi } from "vitest";
import { createTactile } from "./index";

describe("createTactile().test", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("paces presets by scaled haptic duration when it exceeds the 500ms floor", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const tactile = createTactile({
      debug: true,
      strength: 2,
      events: {
        selection: {
          haptic: { steps: [{ duration: 400, intensity: 1 }], ios: "light" },
          motion: { kind: "none" },
        },
      },
    });

    const run = tactile.test();

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenLastCalledWith("[tactile] selection");

    await vi.advanceTimersByTimeAsync(799);
    expect(log).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenLastCalledWith("[tactile] light");

    await vi.runAllTimersAsync();
    await run;
  });

  it("paces presets by the longest known motion spec duration", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const tactile = createTactile({
      debug: true,
      events: {
        selection: {
          haptic: { steps: [{ duration: 10, intensity: 1 }], ios: "light" },
          motion: [
            { kind: "particles", duration: 650 },
            { kind: "boop", timing: 900 },
          ],
        },
      },
    });

    const run = tactile.test();

    expect(log).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(899);
    expect(log).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenLastCalledWith("[tactile] light");

    await vi.runAllTimersAsync();
    await run;
  });
});
