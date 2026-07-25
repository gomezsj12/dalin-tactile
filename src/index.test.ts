import { afterEach, describe, expect, it, vi } from "vitest";
import { createTactile } from "./index";
import { DEFAULT_EVENTS, PRESET_EVENTS, resolveEvents } from "./presets";
import { SYNTH_CUES } from "./sound/synth";

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
    expect(log).toHaveBeenLastCalledWith("[tactile] press");

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
    expect(log).toHaveBeenLastCalledWith("[tactile] press");

    await vi.runAllTimersAsync();
    await run;
  });
});

describe("preset events resolve against the built-in sound pack", () => {
  // The contract that actually breaks silently: an event names a cue the pack
  // doesn't have, and that event just goes mute with no error anywhere.
  it("names a cue the synth pack knows for every default event", () => {
    for (const name of PRESET_EVENTS) {
      const cue = DEFAULT_EVENTS[name].sound;
      expect(cue, `${name} has no sound cue`).toBeTruthy();
      expect(SYNTH_CUES, `${name} → "${cue}"`).toContain(cue);
    }
  });

  it("gives every event a full recipe on all three channels", () => {
    const table = resolveEvents();
    for (const name of PRESET_EVENTS) {
      expect(table[name].haptic?.steps.length, name).toBeGreaterThan(0);
      expect(table[name].motion, name).toBeDefined();
    }
  });

  it("keeps the new interaction events in the vocabulary", () => {
    expect(PRESET_EVENTS).toEqual(
      expect.arrayContaining(["press", "release", "toggle", "loading", "ready"]),
    );
  });
});

describe("cue()", () => {
  // Node has no AudioContext, so this is the SSR path: silent, never throwing.
  it("is a safe no-op with no sound channel", () => {
    const t = createTactile({ sound: true });
    expect(() => t.cue("chime")).not.toThrow();
    expect(() => t.cue("not-a-real-cue")).not.toThrow();
    expect(t.cues()).toEqual([]);
  });
});
