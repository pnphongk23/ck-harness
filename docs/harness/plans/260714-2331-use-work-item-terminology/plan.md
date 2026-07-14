---
title: "Use Work Item terminology throughout Harness"
description: "Replace dual Plan-child naming with one Work Item schema, filename, diagnostic, workflow, skill, test, and artifact contract."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "1 day"
branch: "main"
tags: [harness, workflow, work-item, migration]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports:
    - "[[REP-004-use-work-item-terminology-throughout-harness|REP-004]]"
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/plans/260714-2331-use-work-item-terminology/design.md
    - src/core/schemas/artifacts.ts
    - src/core/integrity.ts
    - src/core/skill-routing.ts
    - tests/artifacts.test.ts
    - tests/integrity.test.ts
    - tests/index-resolution.test.ts
    - tests/workflows.test.ts
created: "2026-07-14T23:31:51+07:00"
createdBy: "Codex"
source: "DEC-008 terminology migration"
---

# Use Work Item terminology throughout Harness

## Overview

Migrate the complete active Harness contract from two names for one Plan child
to Work Item only. The migration preserves approval, ordering, dependencies,
execution evidence, and completed history while changing persisted names and
machine validation atomically.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Migrate the Work Item contract](./work-item-01-migrate-work-item-contract.md) | Completed |
| 2 | [Verify the single-term model](./work-item-02-verify-work-item-model.md) | Completed |

## Requirement coverage

| Requirement or objective | Delivering Work Item |
| --- | --- |
| FEAT-002 FR-008 — ordered Work Items with inline Tasks | 1 |
| FEAT-002 FR-009 — Work Item is the only Plan-child name | 1, 2 |
| FEAT-002 FR-011 — Plan coverage maps to Work Items | 1 |
| FEAT-002 FR-012 — Cook one eligible Work Item at a time | 1, 2 |
| FEAT-003 FR-002 — validate filename, lifecycle, and cross-document invariants | 1, 2 |
| FEAT-003 FR-005/FR-006 — actionable stable diagnostics and machine gate | 1, 2 |
| FEAT-001 BR-003/NFR-001 — preserve user changes and deterministic output | 1, 2 |
| TECH-001 — migrate every existing Plan child and inbound reference atomically | 1 |
| TECH-002 — retain no compatibility alias for the former unit name | 1, 2 |
| TECH-003 — restore agreement between generated index core links and workflow tests | 1, 2 |

## Dependencies and risks

- DEC-008 is approved and supersedes the compatibility choice in DEC-007.
- The blocked `260714-0033-file-based-agent-harness` Plan overlaps shared schema
  files but not this terminology migration; its execution evidence remains unchanged.
- The current validator understands only the pre-migration Plan-child shape.
  DEC-008 authorizes this bootstrap Plan to migrate itself atomically.
- A partial rename would make canonical scanning fail. Work Item 1 must update
  schema, artifacts, links, and tests as one working-tree change before validation.
