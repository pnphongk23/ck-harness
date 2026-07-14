---
title: "Repair integrity contract gaps"
description: "Restore FEAT-003 index, lifecycle, layout, and remediation guarantees identified by an independent review without expanding the command surface."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "1-2 days"
branch: "main"
tags: [harness, integrity, validation, regression]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-1128-verify-harness-integrity/plan|Plan]]"
  reports:
    - "[[REP-001-verify-harness-integrity|REP-001]]"
    - "[[REP-002-repair-integrity-contracts|REP-002]]"
  rules: []
  features:
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - src/core/integrity.ts
    - src/core/lifecycle.ts
    - tests/integrity.test.ts
    - tests/cli-lifecycle.test.ts
created: "2026-07-14T05:30:00.000Z"
createdBy: "ck:plan"
source: review-follow-up
---

# Repair integrity contract gaps

## Overview

This follow-up addresses verified FEAT-003 gaps recorded after REP-001. It
does not reopen or rewrite the completed delivery evidence. The implementation
keeps `validate`, `index check`, and `doctor` read-only and does not add index
build, watch, adapter, process, agent, network, Git, or delivery behavior.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Restore index and lifecycle validation](./phase-01-restore-validation.md) | Completed |

## Dependencies

- FEAT-003 remains approved and owns the delivered integrity behavior.
- DEC-001 remains approved and governs any existing CLI command parsing; this
  Plan adds no new command.
- REP-001 is completed historical evidence. Rejection findings create this
  follow-up instead of modifying the prior Report.
- REP-002 records verified follow-up delivery after this Plan's required phase
  passed.
