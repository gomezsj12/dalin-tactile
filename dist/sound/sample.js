export function createSamplePack(manifest) {
    const name = manifest.name ?? "samples";
    return {
        name,
        async create(ctx) {
            const base = manifest.baseUrl ?? "";
            const buffers = new Map();
            const master = ctx.createGain();
            master.connect(ctx.destination);
            // Small UI sounds — decode them all up front. A missing/failed file just
            // leaves that cue silent rather than throwing.
            await Promise.all(Object.entries(manifest.cues).map(async ([cue, file]) => {
                try {
                    const res = await fetch(base + file);
                    if (!res.ok)
                        return;
                    const bytes = await res.arrayBuffer();
                    buffers.set(cue, await ctx.decodeAudioData(bytes));
                }
                catch {
                    /* cue stays silent */
                }
            }));
            return {
                name,
                cues: [...buffers.keys()],
                play(cue, opts) {
                    const buffer = buffers.get(cue);
                    if (!buffer)
                        return;
                    const src = ctx.createBufferSource();
                    src.buffer = buffer;
                    const gain = ctx.createGain();
                    gain.gain.value = opts?.volume ?? 1;
                    src.connect(gain).connect(master);
                    src.start();
                },
            };
        },
    };
}
//# sourceMappingURL=sample.js.map