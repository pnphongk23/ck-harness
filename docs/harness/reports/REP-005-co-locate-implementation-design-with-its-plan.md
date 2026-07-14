---
schema_version: 1
title: Co-locate implementation design with its Plan
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
  plans:
    - "[[260714-2354-co-locate-plan-design/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/plans/260714-2354-co-locate-plan-design/design.md
    - docs/harness/plans/260714-2331-use-work-item-terminology/design.md
    - src/core/integrity.ts
    - tests/artifacts.test.ts
    - tests/integrity.test.ts
    - tests/workflows.test.ts
type: report
id: REP-005
status: completed
delivered: 2026-07-14
---

# REP-005: Co-locate implementation design with its Plan

## Delivered outcome

Harness now stores optional delivery-specific implementation design as plain
`design.md` beside its owning `plan.md`. The Plan links the exact path; reusable
contracts remain Specs or Decisions; no standalone Design lifecycle or top-level
design tree remains.

## Changed files

- FEAT-002, DEC-009, lifecycle Spec, Rules, schema, workflow router, Plan/Cook/
  Feature workflows, README, and Plan skill — define the Plan-local ownership boundary.
- `src/core/integrity.ts` — excludes only exact Plan-local `design.md` from
  lifecycle parsing, then checks sibling Plan ownership and exact source-path trace.
- `tests/artifacts.test.ts`, `tests/integrity.test.ts`, and
  `tests/workflows.test.ts` — cover plain Markdown, valid ownership, invalid
  external/unlinked design, index exclusion, and canonical guidance.
- The Work Item terminology design and its Plan/REP-004 source paths — migrated
  from the removed top-level design tree into the completed owning Plan.

## Verification evidence

- `npm run verify` — passed on 2026-07-14: TypeScript checks and 76 tests passed,
  0 failed.
- `node dist/src/cli/bin.js validate --all` — passed with no findings.
- `node dist/src/cli/bin.js index check` — passed with no findings.
- `node dist/src/cli/bin.js doctor` — passed with no findings.
- `node dist/src/cli/bin.js graph check --json` — detected Graphify 0.8.39.
- `npm pack --dry-run` — passed with 66 allowlisted package entries.
- `git diff --check` — passed.
- Filesystem and text audit confirmed two Plan-local designs and no
  `docs/harness/design/` directory. Remaining old-location text is limited to
  superseded history, DEC-009 alternatives/migration evidence, and a negative test.

## Plan variance

The pre-change scanner could not validate the bootstrap Plan's plain design.
DEC-009 explicitly authorized the atomic migration; focused scanner tests passed
before the existing design was moved and full validation was rerun.

## Repeated friction

Separating a delivery-specific design from its Plan created unclear ownership
in this migration. DEC-009 and the new deterministic checks resolve that
observed case; no independent recurrence is claimed.
