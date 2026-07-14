---
title: "File-Based Multi-Agent Repository Harness"
description: "Complete the approved Harness artifact lifecycle CLI while preserving the verified repository contracts and workflow foundation."
status: blocked
status_reason: "Work Item 5 requires Linux and Windows verification evidence that is unavailable until an external CI run is authorized and completed."
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "2-3 weeks remaining"
branch: "main"
tags: [harness, cli, file-based, claudekit, agent-skills]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  plans: []
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths: []
created: "2026-07-13T17:33:23.850Z"
createdBy: "ck:plan"
source: skill
---

# File-Based Multi-Agent Repository Harness

## Overview

Complete the approved FEAT-001 artifact lifecycle on top of the verified file-based Harness foundation from Work Items 1–3. The remaining executable scope is initialization, canonical artifact scaffolding, Feature discovery and lifecycle mutation, monotonic ID allocation, and allowlisted cleanup. DEC-001 selects Node `parseArgs`; DEC-002 selects minimal per-file atomic writes with best-effort handled rollback and no automatic crash recovery. Repository Maintainer approval authorizes Cook to begin the next eligible Work Item without expanding into FEAT-003–005.

### Outcomes

- An idempotent repository-local Harness initialization command.
- Canonical scaffolding for supported Harness artifact types with immutable monotonic IDs where required.
- Read-only Feature list and show operations.
- Safe Feature rename, deprecation, explicit deletion, and cleanup behavior that preserves user changes and relationships.
- Cross-platform verification of the complete approved artifact lifecycle, including failure and conflict paths.

### Non-Goals

- No SQLite database, `harness.db` migration importer, event store, or trace ledger in MVP.
- No MCP server, dashboard, hosted service, agent orchestration, commit, push, or deployment behavior.
- No public Harness integrity verification, index build/check, watcher, knowledge graph, runtime-adapter, or doctor capability until FEAT-003–005 are approved and separately planned.
- No promise of multi-writer transactions; FEAT-001 supports one Harness CLI writer and must preserve conflicting external user changes.

## Work Items

| Work Item | Name | Status |
|-------|------|--------|
| 1 | [Foundation and Contracts](./work-item-01-foundation-and-contracts.md) | Completed |
| 2 | [Document Model and Templates](./work-item-02-document-model-and-templates.md) | Completed |
| 3 | [Workflow and Skill Ports](./work-item-03-workflow-and-skill-ports.md) | Completed |
| 4 | [CLI Artifact Lifecycle](./work-item-04-cli-core-and-validation.md) | Completed |
| 5 | [Artifact Lifecycle Verification and Release Readiness](./work-item-05-artifact-lifecycle-verification.md) | Blocked |

## Dependencies

- Node.js 20+ and npm for CLI development and distribution.
- ClaudeKit CLI for plan compatibility tests; installed version at planning time is 4.4.0.
- Approved FEAT-001 and the completed repository contract, document model, and workflow foundation from Work Items 1–3.
- Approved DEC-001 and DEC-002 define the Work Item 4 command and mutation boundaries.
