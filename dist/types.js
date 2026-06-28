/**
 * @dalin/tactile — make web interactions feel real.
 *
 * One semantic event (success, selection, press, …) fires up to THREE
 * independent channels in concert:
 *   • haptic — vibration / iOS Taptic (tunable PWM)
 *   • sound  — Web Audio (built-in synth pack, or a CC0 sample pack)
 *   • motion — on-screen feedback (emoji/particle burst, springy "boop")
 *
 * Every channel is independently on/off and tunable: haptics only, sound only,
 * the works. Motion auto-respects `prefers-reduced-motion`.
 *
 * The haptic surface is Capacitor / iOS `UIFeedbackGenerator` shaped, so a
 * native backend can slot in later without changing call sites.
 */
export {};
//# sourceMappingURL=types.js.map