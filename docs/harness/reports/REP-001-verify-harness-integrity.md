---
schema_version: 1
type: report
id: REP-001
title: Verify Harness integrity
status: completed
delivered: 2026-07-14
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-1128-verify-harness-integrity/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - src/core/integrity.ts
    - src/cli/index.ts
    - tests/integrity.test.ts
    - tests/cli-lifecycle.test.ts
---

# REP-001: Verify Harness integrity

## Delivered outcome

Delivered deterministic, read-only Harness validation, derived-index correctness
checking, and consolidated health diagnostics for people and CI. `validate`,
`index check`, and `doctor` have strict command grammar and stable outcomes.

## Changed files

- `src/core/integrity.ts` — scanner-derived expected index, index correctness,
  doctor prerequisites, and optional Graphify warning.
- `src/cli/index.ts` — `index check` and `doctor` command registration.
- `tests/integrity.test.ts` and `tests/cli-lifecycle.test.ts` — deterministic,
  invalid-state, optional-warning, strict-grammar, and no-write coverage.
- `docs/harness/README.md` — delivered command surface and read-only boundaries.

## Verification evidence

- `npm run verify` — passed on 2026-07-14: TypeScript check passed; 40 tests
  passed and 0 failed.
- Source-boundary audit — no child-process, watcher, index-build, or write path
  is present in delivered integrity command implementations.
- Fixture snapshots before and after validate, index check, and doctor matched.

## Plan variance

No material variance. The local repository index is intentionally not rebuilt:
index publication remains outside this Plan and is reported by `index check`.

## Repeated friction

AGY compatibility preflight reported a changed CLI contract. No skill maintenance
was authorized, so AGY was not used; no recurring workflow issue was established.
