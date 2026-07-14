---
title: "Verify Harness integrity"
description: "Deliver deterministic, read-only Harness validation, derived-index correctness checks, and consolidated health diagnostics for contributors, maintainers, and CI."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "2-3 weeks"
branch: "main"
tags: [harness, integrity, validation, index, doctor, ci]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports:
    - "[[REP-001-verify-harness-integrity|REP-001]]"
  rules: []
  features:
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/README.md
    - src/cli/index.ts
    - src/core/lifecycle.ts
    - src/index/index.ts
created: "2026-07-14T04:29:26.697Z"
createdBy: "ck:plan"
source: skill
---

# Verify Harness integrity

## Overview

Implement FEAT-003 as a deterministic, non-mutating integrity capability. The
shared engine produces ordered, actionable findings for document validation,
persisted-index correctness, and `doctor`; the CLI exposes those outcomes for
people and CI. This Plan deliberately does not build or watch the index,
synchronize runtime adapters, or repair authored documents: those behaviors
remain outside this Plan or require an explicit user action.

Repository Maintainer approved this Plan on 2026-07-14. All required phases
completed with the evidence recorded in their phase documents and REP-001.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Diagnostic model and repository scan](./phase-01-diagnostics.md) | Completed |
| 2 | [Scoped Harness validation](./phase-02-scoped-validation.md) | Completed |
| 3 | [Derived index correctness gate](./phase-03-index-correctness.md) | Completed |
| 4 | [Consolidated health diagnostics](./phase-04-health-diagnostics.md) | Completed |
| 5 | [Integrity verification and delivery](./phase-05-verification.md) | Completed |

## Dependencies

- The in-progress [[260714-0033-file-based-agent-harness/plan|Plan]] governs
  FEAT-001 only. It does not authorize or implement this Plan, but its
  lifecycle parsers, repository discovery, CLI grammar, and artifact contracts
  are prerequisites that this Plan reuses without weakening.
- [[DEC-001-cli-command-parsing|DEC-001]] is approved and governs command
  registration and strict option parsing.
- No watcher, Graphify build, index rebuild, or runtime-adapter
  synchronization is in this Plan. Those capabilities require their own
  governing Feature and Decision before implementation.
