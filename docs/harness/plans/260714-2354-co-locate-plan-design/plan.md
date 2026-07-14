---
title: "Co-locate implementation design with its Plan"
description: "Make optional plan-local design.md the only Harness location for delivery-specific implementation design and enforce its ownership trace."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "4 hours"
branch: "main"
tags: [harness, workflow, design, traceability]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
  plans:
    - "[[260714-2331-use-work-item-terminology/plan|Plan]]"
  reports:
    - "[[REP-005-co-locate-implementation-design-with-its-plan|REP-005]]"
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/plans/260714-2354-co-locate-plan-design/design.md
    - src/core/integrity.ts
    - tests/integrity.test.ts
    - tests/artifacts.test.ts
    - tests/workflows.test.ts
created: "2026-07-14T23:54:32+07:00"
createdBy: "Codex"
source: "Approved DEC-009 design-location change"
---

# Co-locate implementation design with its Plan

## Overview

Replace the separate Harness design tree with one optional supporting
`design.md` owned by its containing Plan. Update authority, validation, tests,
and the existing design link without creating a Design lifecycle artifact.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Adopt and enforce plan-local design](./work-item-01-adopt-plan-local-design.md) | Completed |
| 2 | [Migrate and verify design traces](./work-item-02-migrate-and-verify-design-traces.md) | Completed |

## Requirement coverage

| Requirement or objective | Delivering Work Item |
| --- | --- |
| FEAT-002 FR-006 — Plan-owned implementation design | 1, 2 |
| FEAT-002 BR-001/BR-003 — preserve authority boundaries | 1 |
| FEAT-003 FR-002 — validate cross-document and layout invariants | 1, 2 |
| FEAT-003 FR-005/FR-006 — actionable deterministic gate | 1, 2 |
| DEC-009 — optional sibling `design.md`, exact source-path trace, no standalone lifecycle | 1, 2 |
| TECH-001 — migrate the existing Work Item design and inbound source paths | 2 |
| TECH-002 — retain no top-level Harness design directory or compatibility alias | 2 |

## Dependencies and risks

- DEC-009 and the revised FEAT-002 behavior are approved by the Repository Maintainer.
- The pre-change scanner rejects plain Markdown inside a Plan directory. This
  bootstrap Plan must update scanner behavior and add its own design atomically.
- Excluding `design.md` from artifact parsing must not hide arbitrary Plan files;
  only the exact sibling path is recognized as supporting design.
- Completed Plan and Report evidence must retain resolved source paths after migration.
