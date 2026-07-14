---
phase: 4
title: "Consolidated Health Diagnostics"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1, 2, 3]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
---

# Phase 4: Consolidated Health Diagnostics

## Overview

Implement `harness doctor` as a read-only composition of required Harness
health checks and optional-capability warnings. Runtime-adapter discovery,
synchronization, and diagnostics are not part of this Plan.

## Implementation Steps

1. Define doctor check providers for repository discovery, supported Node and
   schema versions, canonical workflow sources, and index correctness.
2. Register required prerequisite failures as errors and optional limitations
   as warnings; in particular, detect unavailable Graphify locally without
   invoking it or sending repository content externally.
3. Compose provider outcomes into the Phase 1 diagnostic model, preserving
   deterministic ordering and an explicit overall outcome that permits
   warnings without treating required failures as success.
4. Add the `doctor` command, human grouping, JSON envelope, and stable exit
   behavior under DEC-001.
5. Update user-facing command documentation only for delivered FEAT-003
   behavior and retain clear non-goals for index build/watch and adapters.

## Success Criteria

- [x] `harness doctor` reports required repository, version, schema, workflow,
      and index prerequisites as source-specific errors when they fail.
- [x] Missing Graphify produces a warning with remediation, does not invoke a
      process, and does not make otherwise valid canonical Harness state fail.
- [x] Doctor output has deterministic severity grouping, stable identifiers,
      repository-relative paths, and matching human/JSON outcome semantics.
- [x] Tests demonstrate that doctor never repairs documents, builds the index,
      invokes Graphify, or synchronizes adapters.

## Verification Evidence

- `npm run check && npm test` passed on 2026-07-14: TypeScript typecheck passed
  and 40 tests passed, including required-precondition diagnostics, stable JSON
  success with optional warnings, an injected missing-Graphify environment, and
  before/after workspace snapshots.
- Source-boundary assertions confirm the integrity module does not import or
  invoke child-process APIs; Graphify discovery uses only filesystem checks.
