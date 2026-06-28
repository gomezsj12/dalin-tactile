---
description: Run the @dalin/tactile code-review process and log findings
---

Perform a code review of @dalin/tactile following the project's documented process.

**Read first (in order):**
1. `AGENTS.md` — agent rules, critical warnings, conventions
2. `docs/CODE_REVIEW.md` — the phased process + anti-patterns for this library
3. `docs/code-audit.md` — existing findings (don't re-file what's catalogued)
4. `docs/ARCHITECTURE.md` — how the channels/backends/swap-seam fit together

**Then:**
- Work through the phases in `docs/CODE_REVIEW.md` (documentation → comments → correctness/lifecycle → channels → performance → API/types → SSR/robustness → build/tooling). Don't skip phases.
- For each new issue, add an `AUDIT-NNN` entry to `docs/code-audit.md` (sequential id, never reused) and drop a `// AUDIT-NNN` locator comment at the site.
- **Do not change library logic during a review** unless explicitly asked. A review's output is findings + a session log, not a refactor. If you do change code: one change at a time, `npm run build` + `npm test` after each.
- Verify gates: `npm run build`, `npm test`, `npm run lint`, `npm run size`.

**After:**
- Write a session log to `docs/reviews/YYYY-MM-DD-<short-description>.md` (sections: Reviewer, Requested by, Scope, Work done, Findings summary by severity, Changes made, Verification results, Deferred items, Notes for future reviewers).
- Update `docs/change-log.md` and, if you fixed/found a bug, `docs/error-log.md`.

$ARGUMENTS
