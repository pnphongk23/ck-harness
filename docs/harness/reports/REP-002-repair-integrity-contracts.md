---
schema_version: 1
type: report
id: REP-002
title: Repair integrity contract gaps
status: completed
delivered: 2026-07-14
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-1230-repair-integrity-contracts/plan|Plan]]"
  reports:
    - "[[REP-001-verify-harness-integrity|REP-001]]"
  rules: []
  features:
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - src/core/integrity.ts
    - tests/integrity.test.ts
    - tests/cli-lifecycle.test.ts
---

# REP-002: Repair integrity contract gaps

## Delivered outcome

Repaired the verified FEAT-003 gaps without adding a command or write path.
Index checks now preserve lifecycle sequence counters, full scans reject missing
Decision/lifecycle/layout evidence, and index remediation does not name an
unreleased command.

## Changed files

- `src/core/integrity.ts` — index counter rendering and validation, lifecycle
  aggregation and eligibility diagnostics, plan layout checks, and accurate
  remediation.
- `tests/integrity.test.ts` — regression fixtures for all reviewed integrity
  gaps and read-only outcomes.
- `tests/cli-lifecycle.test.ts` — `init` and artifact lifecycle counter
  integration coverage for `index check`.

## Verification evidence

- `npm run verify` — passed on 2026-07-14: typecheck passed and 43 tests
  passed, 0 failed.
- `git diff --check` — passed.
- Fixture snapshots verify validate, index check, and doctor do not mutate the
  repository; source-boundary tests retain no-process/no-watcher coverage.

## Plan variance

No material variance. The fix preserves the approved read-only command surface;
index publication remains separate planned work.

## Repeated friction

An independent review found gaps in the original FEAT-003 delivery. This
follow-up records the single verified occurrence; no reusable recurrence is
established.
