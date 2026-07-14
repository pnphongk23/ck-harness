---
work_item: 5
title: "Navigation Verification and Delivery"
status: completed
priority: P1
effort: "2-3 days"
dependencies: [1, 2, 3, 4]
decision_dependencies:
  - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
  - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
---

# Work Item 5: verification-and-delivery

## Overview

Verify the complete FEAT-004 contract across deterministic index publication,
link evidence, watcher resilience, optional graph degradation, and privacy.
Create the required Delivery Report before marking the Plan complete.

## Implementation Steps

1. Run typecheck, unit, integration, CLI, fixture, and package verification for
   index build, link resolution, watch, graph check, and graph build.
2. Execute determinism checks over repeated scans/builds and normalized path
   forms, asserting byte-identical index output and no clock or host fields.
3. Execute preservation tests that hash canonical Markdown and the last valid
   index before invalid builds, invalid watched edits, graph failures, and
   graph-output deletion.
4. Test process and command boundaries: `index check` remains read-only and
   independent of watch; Graphify is explicit, local, shell-free, and optional;
   no command adds agent, network, Git, release, or deployment behavior.
5. Revalidate plan relationships, Work Item dependencies, Decision approval, and
   documentation. Create a `REP-XXX` Delivery Report with changed files, exact
   commands/output, variance, limitations, and recurrence evidence.

## Success Criteria

- [x] `npm run verify` plus all navigation-specific test suites pass, with
      recorded outputs covering the FEAT-004 acceptance scenarios and failure
      cases.
- [x] Determinism and mutation-detection evidence proves stable derived index
      bytes, no authored Markdown mutation, and preservation of the last valid
      index through invalid source, watcher, and graph outcomes.
- [x] Boundary tests prove `index check` neither writes nor watches, watch is
      not a CI gate, and Graphify is invoked only by explicit local build with
      explicit transmission acknowledgement and no unapproved process side
      effects.
- [x] A completed Delivery Report links FEAT-004 and this Plan and records
      exact verification evidence, variance, limitations, and repeated-friction
      evidence before Plan completion.

## Verification Evidence

- `npm run verify` — passed on 2026-07-14: typecheck and all 74 tests passed.
- Focused Work Item 4 integration command — passed: all 31 graph, index-resolution,
  watcher, and lifecycle tests passed.
- `npm pack --dry-run --json` — passed with 66 allowlisted entries.
- `git diff --check` — passed.
- [[REP-003-maintain-navigable-harness-knowledge|REP-003]] records delivery,
  variance, limitations, and independent AGY review evidence.
