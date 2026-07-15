---
title: "Add verified discovery and planning skills"
description: "Port focused Ask, Brainstorm, and Scout behavior into repository-local skills and harden Feature and Plan workflows against unverified decisions."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-15
priority: P1
effort: "4 hours"
branch: "main"
tags: [harness, skills, discovery, planning, verification]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans: []
  reports:
    - "[[REP-006-deliver-verified-discovery-and-planning-skills|REP-006]]"
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
  source_paths:
    - .agents/skills/harness-feature/SKILL.md
    - .agents/skills/harness-plan/SKILL.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - docs/harness/SKILL-PORTS.md
    - docs/harness/PROVENANCE.md
    - src/core/skill-routing.ts
    - tests/skills.test.ts
    - tests/workflows.test.ts
created: "2026-07-15T23:24:35+07:00"
createdBy: "Codex"
source: "Approved FEAT-007 skill workflow change"
---

# Add verified discovery and planning skills

## Overview

Add three concise repository-local utility skills, then make Feature and Plan
workflows explicitly compose their strongest discovery and verification
behaviors. Keep canonical artifact rules in repository workflows, remove all
personal and delegated-agent dependencies, and require human confirmation for
material choices that evidence cannot resolve.

No separate `design.md` is needed: the implementation follows the approved
behavior and existing thin-router architecture without introducing a reusable
technical contract or a new architectural boundary.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Add focused utility skills](./work-item-01-add-focused-utility-skills.md) | Completed |
| 2 | [Harden Feature and Plan verification](./work-item-02-harden-feature-and-plan-verification.md) | Completed |

## Requirement coverage

| Requirement or objective | Delivering Work Item |
| --- | --- |
| FEAT-007 FR-001 — focused Ask, Brainstorm, and Scout skills | 1 |
| FEAT-007 FR-002 — scout before material questions and approaches | 1, 2 |
| FEAT-007 FR-003 — exact discovery boundary | 1, 2 |
| FEAT-007 FR-004 — two or three grounded alternatives and human choice | 1, 2 |
| FEAT-007 FR-005 — evidence labels | 1, 2 |
| FEAT-007 FR-006 — verify material Plan claims | 2 |
| FEAT-007 FR-007 — interview unresolved Plan choices | 2 |
| FEAT-007 FR-008 — whole-plan consistency sweep | 2 |
| FEAT-007 BR-001 — utility and planning skills do not implement | 1, 2 |
| FEAT-007 BR-002 — local-only, no delegated agents or personal configuration | 1, 2 |
| FEAT-007 NFR-001 — concise utility skills, canonical workflow ownership | 1, 2 |
| FEAT-007 NFR-002 — every readiness claim has evidence or unresolved status | 1, 2 |

## Dependencies and risks

- FEAT-002, FEAT-003, and FEAT-007 are approved; no blocking Decision remains.
- The blocked `260714-0033-file-based-agent-harness` Plan has no scope overlap:
  its only unfinished Work Item is external platform verification and release readiness.
- At planning time, `tests/skills.test.ts` required exactly five skills, so
  routing and inventory expectations had to change atomically with the three new directories.
- At planning time, R-022 named only `harness-*` thin routers; its scope needed
  widening without making utility skills a second source of workflow authority.
- Ask and Scout source metadata lacks a license declaration. Reimplement their
  useful public behavior and record provenance; do not copy their prose.
- Dense hard gates can create unnecessary user interruptions. Ask only when a
  material choice remains unresolved after direct evidence and approved authority.
- Preserve the user's existing `package.json` modification and do not include it
  in this Plan's changes.

## Approval evidence

- Product Authority approved the Feature boundary on 2026-07-15.
- Repository Maintainer approved this Plan, both Work Items, risks, coverage,
  and success criteria on 2026-07-15.
