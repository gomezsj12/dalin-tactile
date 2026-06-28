import { PRESET_EVENTS, resolveEvents } from "./presets.js";
import { createWebBackend } from "./backends/web.js";
import { createSilentBackend } from "./backends/silent.js";
import { detectPlatform } from "./platform.js";
import { iosSwitchAvailable } from "./ios-switch.js";
const isBrowser = typeof window !== "undefined";
export function createTactile(config = {}) {
    let events = resolveEvents(config.events);
    let hapticsOn = config.haptics ?? true;
    let strength = config.strength ?? 1;
    let volume = config.volume ?? 1;
    let scale = config.scale ?? 1;
    const debug = config.debug ?? false;
    const backend = !isBrowser || config.backend === "silent" ? createSilentBackend() : createWebBackend();
    // ── sound channel: opt-in, lazily constructed, never bundled unless enabled ──
    let audioCtx = null;
    let sound = null;
    let soundName = false;
    let soundSpec; // last requested — for idempotent re-enable
    function getAudioContext() {
        if (!isBrowser)
            return null;
        if (!audioCtx) {
            const Ctor = window.AudioContext ??
                window.webkitAudioContext;
            if (!Ctor)
                return null;
            try {
                audioCtx = new Ctor();
            }
            catch {
                return null;
            }
        }
        return audioCtx;
    }
    // Resume whenever suspended. Safe to call from any user gesture (iOS needs it).
    function resumeAudio() {
        const c = audioCtx;
        if (c && c.state !== "running")
            void c.resume().catch(() => { });
    }
    function enableSound(pack) {
        if (pack === soundSpec) {
            if (pack)
                resumeAudio(); // already in this state — just keep it unlocked
            return;
        }
        soundSpec = pack;
        sound = null;
        soundName = false;
        if (!pack || !isBrowser)
            return;
        // Create + resume the context SYNCHRONOUSLY within the enabling gesture —
        // doing it later (inside the async import) is what left iOS silent.
        if (getAudioContext())
            resumeAudio();
        void (async () => {
            try {
                const resolved = pack === true ? (await import("./sound/synth.js")).synthPack : pack;
                const ctx = getAudioContext();
                if (!ctx)
                    return;
                const channel = await resolved.create(ctx);
                sound = channel;
                soundName = channel.name;
            }
            catch (err) {
                if (debug)
                    console.warn("[tactile] sound pack failed to load", err);
            }
        })();
    }
    // ── motion channel: opt-in, lazily constructed ──────────────────────────────
    let motion = null;
    let motionName = false;
    let motionSpec; // last requested — for idempotent re-enable
    function enableMotion(driver) {
        if (driver === motionSpec)
            return; // already in this state — don't tear down a loaded driver
        motionSpec = driver;
        motion = null;
        motionName = false;
        if (!driver || !isBrowser)
            return;
        if (driver !== true) {
            motion = driver;
            motionName = driver.name;
            return;
        }
        void (async () => {
            try {
                const { domMotionDriver } = await import("./motion/index.js");
                motion = domMotionDriver;
                motionName = domMotionDriver.name;
            }
            catch (err) {
                if (debug)
                    console.warn("[tactile] motion driver failed to load", err);
            }
        })();
    }
    if (config.sound)
        enableSound(config.sound);
    if (config.motion)
        enableMotion(config.motion);
    // Resume audio on ANY gesture while suspended (NOT once — the bug before).
    if (isBrowser) {
        const onGesture = () => resumeAudio();
        for (const ev of ["pointerdown", "touchend", "mousedown", "keydown"]) {
            window.addEventListener(ev, onGesture, { capture: true, passive: true });
        }
    }
    function reducedMotion() {
        return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    // ── firing ───────────────────────────────────────────────────────────────
    function fire(recipe, target) {
        if (hapticsOn && recipe.haptic) {
            backend.cancel();
            backend.fire(recipe.haptic, strength);
        }
        if (sound && recipe.sound) {
            resumeAudio(); // we're inside the tap gesture — safe to unlock here too
            sound.play(recipe.sound, { volume });
        }
        if (motion && recipe.motion) {
            const runtime = { reducedMotion: reducedMotion(), scale };
            const specs = Array.isArray(recipe.motion) ? recipe.motion : [recipe.motion];
            for (const spec of specs)
                motion.render(spec, target, runtime);
        }
    }
    function fireEvent(name, target) {
        const recipe = events[name];
        if (recipe)
            fire(recipe, toTarget(target));
    }
    function buildReport() {
        const platform = detectPlatform();
        const probe = backend.probe();
        return {
            backend: backend.kind,
            channels: { haptics: hapticsOn, sound: soundName, motion: motionName },
            platform,
            vibrate: probe.vibrate ?? { exists: false, lastReturn: null },
            iosSwitch: probe.iosSwitch ?? { available: iosSwitchAvailable() },
            audio: { enabled: soundName !== false, state: audioCtx ? audioCtx.state : "absent" },
            reducedMotion: reducedMotion(),
            notes: buildNotes(platform, probe, hapticsOn, soundName, motionName),
        };
    }
    return {
        impact: (style = "medium", target) => fireEvent(style, target),
        notification: (type, target) => fireEvent(type, target),
        selection: (target) => fireEvent("selection", target),
        light: (target) => fireEvent("light", target),
        medium: (target) => fireEvent("medium", target),
        heavy: (target) => fireEvent("heavy", target),
        success: (target) => fireEvent("success", target),
        warning: (target) => fireEvent("warning", target),
        error: (target) => fireEvent("error", target),
        buzz: (target) => fireEvent("buzz", target),
        play: (input, target) => {
            if (typeof input === "number") {
                fire({ haptic: { steps: [{ duration: input, intensity: 1 }] } }, toTarget(target));
            }
            else if (Array.isArray(input)) {
                fire({ haptic: { steps: input } }, toTarget(target));
            }
            else {
                fireEvent(input, target);
            }
        },
        set: (next) => {
            if (next.events)
                events = resolveEvents({ ...config.events, ...next.events });
            if (next.haptics !== undefined)
                hapticsOn = next.haptics;
            if (next.strength !== undefined)
                strength = next.strength;
            if (next.volume !== undefined)
                volume = next.volume;
            if (next.scale !== undefined)
                scale = next.scale;
            if (next.sound !== undefined)
                enableSound(next.sound);
            if (next.motion !== undefined)
                enableMotion(next.motion);
        },
        diagnose: () => buildReport(),
        test: async () => {
            for (const name of PRESET_EVENTS) {
                fireEvent(name);
                if (debug)
                    console.log(`[tactile] ${name}`);
                await new Promise((r) => setTimeout(r, 500));
            }
        },
    };
}
function toTarget(target) {
    if (!target || typeof window === "undefined")
        return {};
    if (target instanceof Element)
        return { el: target };
    if ("clientX" in target && "clientY" in target) {
        const ev = target;
        const el = ev.currentTarget instanceof Element
            ? ev.currentTarget
            : ev.target instanceof Element
                ? ev.target
                : null;
        return { el, x: ev.clientX, y: ev.clientY };
    }
    return target;
}
function buildNotes(platform, probe, hapticsOn, soundName, motionName) {
    const notes = [];
    if (!hapticsOn)
        notes.push("Haptic channel off.");
    if (platform.desktop)
        notes.push("Desktop has no vibration motor — sound + motion carry the feedback here.");
    if (platform.android) {
        notes.push(probe.vibrate?.exists
            ? "Android: navigator.vibrate is available. If a call returns true but you feel nothing, the OS vibration / touch-feedback setting or battery saver is off — not the app."
            : "Android: navigator.vibrate is missing in this engine.");
    }
    if (platform.ios) {
        notes.push(probe.iosSwitch?.available
            ? "iOS: invisible-switch Taptic tick (one light tick per call). iOS 26.5 patched the script path; silence on ≥26.5 is the platform, not the app."
            : "iOS: switch-based haptics unavailable on this WebKit version.");
    }
    notes.push(soundName ? `Sound channel: "${soundName}".` : "Sound channel off.");
    notes.push(motionName ? `Motion channel: "${motionName}".` : "Motion channel off.");
    if (platform.standalonePWA)
        notes.push("Running as an installed PWA.");
    return notes;
}
//# sourceMappingURL=index.js.map