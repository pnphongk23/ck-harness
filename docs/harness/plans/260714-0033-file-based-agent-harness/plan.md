---
title: "File-Based Multi-Agent Repository Harness"
description: "Remake repository-harness as a lean file-based CLI, document workflow, and portable skill adapter layer for Claude, Codex, Cursor, and Antigravity."
status: in_progress
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "4-6 weeks"
branch: "main"
tags: [harness, cli, file-based, claudekit, agent-skills]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
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

Build a deterministic repository harness whose durable state is readable Markdown under `docs/harness/`. The CLI is limited to routing, scaffolding, validation, indexing, watching, adapter synchronization, cleanup, and diagnostics; it never launches an AI agent. Feature documents capture business behavior with immutable `FEAT-XXX` identifiers, project-wide specifications remain semantic files without IDs, plans preserve ClaudeKit naming and structure, and Obsidian-style wikilinks plus optional Graphify replace trace storage.

### Outcomes

- A cross-platform `harness` CLI implemented in TypeScript on Node.js 20+.
- A compact document model, classified request routing, interruptible durable
  Decisions, and explicit `authority -> approved plan -> verified cook -> report`
  workflow.
- Canonical Agent Skills with thin adapters for Claude, Codex, Cursor, and Antigravity.
- A generated `docs/harness/index.md` with catalog, backlinks, validation findings, and a monotonic feature sequence.
- Tests proving ID integrity, safe file mutation, watcher reconciliation, adapter correctness, and zero agent spawning.

### Non-Goals

- No SQLite database, `harness.db` migration importer, event store, or trace ledger in MVP.
- No MCP server, dashboard, hosted service, agent orchestration, commit, push, or deployment behavior.
- No promise of multi-writer transactions; MVP supports one CLI writer and reconciles external edits through index checks/watch mode.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation and Contracts](./phase-01-foundation-and-contracts.md) | Completed |
| 2 | [Document Model and Templates](./phase-02-document-model-and-templates.md) | Completed |
| 3 | [Workflow and Skill Ports](./phase-03-workflow-and-skill-ports.md) | Completed |
| 4 | [CLI Core and Validation](./phase-04-cli-core-and-validation.md) | Pending |
| 5 | [Index Watcher and Knowledge Graph](./phase-05-index-watcher-and-knowledge-graph.md) | Pending |
| 6 | [Runtime Adapters and Doctor](./phase-06-runtime-adapters-and-doctor.md) | Pending |
| 7 | [Verification and Release Readiness](./phase-07-verification-and-release-readiness.md) | Pending |

## Dependencies

- Node.js 20+ and npm for CLI development and distribution.
- ClaudeKit CLI for plan compatibility tests; installed version at planning time is 4.4.0.
- Optional `graphify` executable; absence must degrade to a warning.
- Upstream ClaudeKit skills used as attributed adaptation sources: `brainstorm`, `ask`, `scout`, `ck-plan`, `cook`, and `ck-graphify`.
- Official runtime discovery contracts: Claude `.claude/skills`, Codex and Antigravity `.agents/skills`, Cursor `.cursor/commands` and `.cursor/rules`.
