---
phase: 1
title: "Restore Index and Lifecycle Validation"
status: completed
priority: P1
effort: "1-2 days"
dependencies: []
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
---

# Phase 1: Restore index and lifecycle validation

## Overview

Repair the verified integrity gaps without widening the FEAT-003 command
surface. A valid lifecycle-managed index must check successfully, while the
scanner must reject unresolved Decision dependencies and the cross-file
lifecycle and plan-layout violations defined by the active Spec and Rules.

## Implementation Steps

1. Define one deterministic expected-index representation that preserves or
   validates lifecycle-owned monotonic counters alongside canonical digests;
   correct remediation wording so it names an available action or documented
   future workflow, never an unavailable command.
2. Add full-scan validators for unresolved Decision dependencies, Plan approval
   and phase eligibility/order/aggregation, completed-Plan report presence,
   and R-007 plan-directory and phase filename layout.
3. Add regression fixtures for each reviewed failure, including an index made by
   `init` plus artifact lifecycle creation, and prove all commands remain
   read-only, deterministic, and CLI-compatible.

## Success Criteria

- [x] An initialized Harness with lifecycle-managed sequence counters can pass
      `harness index check` when its persisted canonical digest representation
      is current; genuine authored drift still fails without a write.
- [x] Missing Decision dependencies, invalid approval/phase order/aggregation,
      missing completed-Plan reports, and invalid plan layouts return stable,
      source-specific findings during a full scan.
- [x] Every remediation command exists at the delivered command surface; where
      no command is available, the finding gives an accurate documented next
      action instead.
- [x] `npm run verify` passes, and regression fixtures snapshot repository
      files before and after validate, index check, and doctor.

## Verification Evidence

- `npm run verify` passed on 2026-07-14: TypeScript check passed and 43 tests
  passed, 0 failed.
- Regression fixtures cover lifecycle-managed sequence counters, genuine digest
  drift, missing Decision targets, missing predecessor phases, unapproved
  execution, incomplete completed Plans, missing Delivery Reports, invalid Plan
  and phase filenames, missing Graphify, and before/after repository snapshots.
- `git diff --check` passed; static boundary tests retain the prohibition on
  child processes, watchers, index build, and write paths in integrity commands.
