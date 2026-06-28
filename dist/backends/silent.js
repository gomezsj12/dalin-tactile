/** No-op haptic backend for SSR / unsupported engines (sound may still play). */
export function createSilentBackend() {
    return {
        kind: "silent",
        fire() { },
        cancel() { },
        probe() {
            return { kind: "silent" };
        },
    };
}
//# sourceMappingURL=silent.js.map