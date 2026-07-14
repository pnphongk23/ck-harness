---
phase: 2
title: "Scoped Harness Validation"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
---

# Phase 2: Scoped Harness Validation

## Overview

Expose the scanner as `harness validate` for one supported document, one
supported artifact scope, and the complete Harness. Scoped requests include
the cross-document evidence required to assess their integrity, while output
remains concise for humans and stable for CI.

## Implementation Steps

1. Specify unambiguous CLI grammar for document path, artifact-kind scope, and
   complete-Harness validation under the DEC-001 command registry.
2. Resolve requested paths only inside the discovered repository and canonical
   Harness roots; reject missing, ambiguous, unsupported, or escaping targets.
3. Map scan evidence to the requested scope plus necessary inbound/outbound
   relationship checks, without silently escalating a limited command into an
   unrelated whole-repository success claim.
4. Add human rendering grouped by severity and source, plus a stable JSON
   envelope with outcome, findings, governing contract, and remediation.
5. Define and test stable success, invalid-state, rejected-precondition, and
   usage exit-code behavior for CI.
6. Add CLI integration fixtures for one Feature, artifact-kind scope, complete
   Harness, invalid input, and read-only behavior.

## Success Criteria

- [x] `harness validate PATH`, `harness validate --kind KIND`, and
      `harness validate --all` each accept only their documented scope and
      produce deterministic human and JSON outcomes.
- [x] Validating one Feature detects local failures and the necessary
      relationship failures, identifies every independent violation, and does
      not modify the Feature or any related file.
- [x] Invalid target, option, and scope combinations fail with the DEC-001
      usage or precondition outcome rather than being reinterpreted.
- [x] CLI integration tests prove stable exit codes and JSON shape for success,
      canonical invalidity, and unsupported verification context.

## Verification Evidence

- `npm test` passed on 2026-07-14: 36 tests passed, 0 failed.
- CLI coverage proves explicit `PATH`, `--kind`, and `--all` scopes, deterministic
  JSON success/failure envelopes, invalid-state exit code 4, and no repository
  writes during validation.
