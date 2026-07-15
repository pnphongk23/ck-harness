---
title: "Make Scout research the codebase and project"
description: "Expand Scout from targeted file mapping into evidence-backed project and codebase research while preserving local-only read-only execution."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-16
priority: P1
effort: "90 minutes"
branch: "main"
tags: [harness, skills, scout, research, codebase]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans:
    - "[[260715-2324-verified-skill-workflows/plan|Plan]]"
  reports:
    - "[[REP-008-deliver-research-oriented-scout|REP-008]]"
  rules: []
  features:
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
  source_paths:
    - .agents/skills/scout/SKILL.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - docs/harness/SKILL-PORTS.md
    - docs/harness/PROVENANCE.md
    - src/core/skill-routing.ts
    - tests/skills.test.ts
    - tests/workflows.test.ts
created: "2026-07-15T23:43:45+07:00"
createdBy: "Codex"
source: "Product Authority request to restore research-oriented Scout behavior"
---

# Make Scout research the codebase and project

## Overview

Replace Scout's narrow file-mapping posture with a research workflow that first
builds the relevant project baseline and architecture, then traces targeted
code flows, dependencies, tests, conventions, operations, active work, risks,
and unknowns. Keep the result evidence-backed and synthesized rather than an
exhaustive dump. Preserve the approved read-only, repository-local boundary.

No separate design is required. This is a one-skill behavioral correction with
small routing, workflow wording, provenance, and regression-test updates.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Restore research-oriented Scout](./work-item-01-restore-research-oriented-scout.md) | Completed |

## Requirement coverage

| Requirement or objective | Delivering Work Item |
| --- | --- |
| FEAT-007 FR-002 — research before questions and approaches | 1 |
| FEAT-007 FR-005 — evidence labels | 1 |
| FEAT-007 FR-009 — synthesized project and codebase research | 1 |
| FEAT-007 BR-001/BR-002 — no implementation, delegation, external AI, or personal configuration | 1 |
| FEAT-007 NFR-001 — useful concision | 1 |
| FEAT-007 NFR-002 — verifiable claims | 1 |

## Verification ledger

| Claim | Status | Evidence |
| --- | --- | --- |
| Scout currently emphasizes the smallest relevant surface and file discovery | Verified | `.agents/skills/scout/SKILL.md` description, steps 1–8, and output template |
| The original local Claude Scout frames its job as codebase scouting and research across project areas | Verified | `$HOME/.claude/skills/scout/SKILL.md` was inspected during the approved FEAT-007 port; provenance records version 1.0.0 |
| Repository policy prohibits restoring delegated or external research mechanics | Verified | `AGENTS.md` and R-022 prohibit agent delegation and external AI services for this workflow |
| Routing does not currently match “research this project/codebase” | Verified | `src/core/skill-routing.ts` Scout regex covers locate/find/map/search and location questions only |
| The pending init-skill Plan overlaps registered inventory and shared tests but does not modify skill content | Verified, coordination only | `260715-2341-init-skill-files` explicitly says “Do not modify skill contents”; it remains pending and has no execution dependency on this content revision |

Verification totals: 5 Verified, 0 Failed, 0 Unresolved.

## Dependencies and risks

- The completed `260715-2324-verified-skill-workflows` Plan and REP-006 remain
  historical delivery evidence; this follow-up does not rewrite them.
- The completed `260715-2341-init-skill-files` Plan shares routing/workflow tests
  and distributes registered skill bytes, but its delivered scope remains
  separate from this Scout content revision.
- “Research the project” can become an exhaustive repository dump. The report
  must establish a broad baseline, then deepen only the areas relevant to the target.
- Research claims can become vague summaries. Require direct file, symbol,
  relationship, or command evidence for material conclusions.
- Preserve the existing uncommitted `package.json` aliases and every prior
  completed Harness artifact.

## Approval evidence

- Product Authority approved the research-oriented Scout behavior on 2026-07-15.
- Repository Maintainer approved this Plan and Work Item on 2026-07-16.
