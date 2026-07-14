---
work_item: 2
title: "Migrate and verify design traces"
status: completed
priority: P1
effort: "2 hours"
dependencies: [1]
decision_dependencies:
  - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
---

# Work Item 2: Migrate and verify design traces

## Kind

Migration and verification

## Tasks

- [x] Move the existing Work Item model design into its owning completed Plan.
- [x] Update every inbound source path and remove the top-level design tree.
- [x] Audit active guidance and source for stale design-location claims.
- [x] Rebuild the index and run the full verification and package gates.
- [x] Record a Delivery Report before completing the Plan.

## Success criteria

- [x] No implementation design remains under `docs/harness/design/`.
- [x] Every Plan-linked `design.md` is the sibling of its owning `plan.md`.
- [x] No active contract recommends Specs as the home for Plan-specific design.
- [x] Full Harness validation, index check, tests, doctor, and package dry-run pass.

## Evidence

- The two implementation designs now reside beside their owning `plan.md`; the
  top-level `docs/harness/design/` tree is absent.
- Location audit found only historical DEC-007 text, DEC-009 alternatives and
  migration evidence, and the deliberate negative-test path outside Plans.
- `npm run verify` passed TypeScript checks and 76 tests, 0 failed.
- `harness validate --all`, `harness index check`, and `harness doctor` passed
  with no findings.
- `harness graph check --json` detected Graphify 0.8.39.
- `npm pack --dry-run` passed with 66 allowlisted package entries.
- `git diff --check` passed.
- [[REP-005-co-locate-implementation-design-with-its-plan|REP-005]] records delivery.
