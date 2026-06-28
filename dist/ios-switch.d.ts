/** Whether the iOS invisible-switch path is plausibly available (iOS WebKit). */
export declare function iosSwitchAvailable(): boolean;
/**
 * Best-effort single Taptic tick on iOS Safari; no-op everywhere else.
 *
 * Toggling a native `<input switch>` makes iOS play a tick. We click the LABEL —
 * the path WebKit honored for programmatic use on iOS 17.4–26.4. iOS 26.5
 * patched the script path; the documented follow-up is a real, invisible switch
 * the user's own finger toggles (an overlay), which slots in HERE without
 * changing any caller. See docs/DEFERRED.md (AUDIT-016: repointed from a cross-repo path).
 */
export declare function iosTick(): void;
//# sourceMappingURL=ios-switch.d.ts.map