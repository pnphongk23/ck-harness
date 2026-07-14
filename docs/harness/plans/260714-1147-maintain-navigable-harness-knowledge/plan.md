---
title: "Maintain navigable Harness knowledge"
description: "Build deterministic derived Markdown navigation, explicit watch reconciliation, and an optional local graph without changing canonical Harness knowledge."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-14
priority: P1
effort: "2-3 weeks"
branch: "main"
tags: [harness, index, wikilinks, watcher, graph, determinism]
blockedBy:
  - "[[260714-1128-verify-harness-integrity/plan|Plan]]"
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
    - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
    - "[[260714-1128-verify-harness-integrity/plan|Plan]]"
  reports:
    - "[[REP-003-maintain-navigable-harness-knowledge|REP-003]]"
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/README.md
    - src/core/integrity.ts
    - src/fs/atomic-write.ts
    - src/cli/index.ts
created: "2026-07-14T04:48:02.022Z"
createdBy: "ck:plan"
source: skill
---

# Maintain navigable Harness knowledge

## Overview

Implement FEAT-004 as a derived-navigation capability. The command surface will
build a complete byte-stable Markdown index from valid canonical Harness
documents, resolve local links without guessing, reconcile this view only while
explicit watch mode is active, and optionally invoke a local Graphify process.
Canonical authored Markdown remains the authority; index and graph output are
replaceable derived artifacts.

This Plan is deliberately separate from the approved FEAT-003 integrity Plan.
FEAT-003 owns the read-only scanner and `index check`; this Plan may reuse its
completed scanner and renderer contracts but must not change its approved
scope. No FEAT-004 phase may start until the entire FEAT-003 plan is completed,
so the plans never concurrently change shared CLI or index-engine boundaries.
Watch and graph phases also cannot start until DEC-003 is approved. Repository
Maintainer approval is required before any Cook phase starts.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [index-build](./phase-01-index-build.md) | Completed |
| 2 | [link-resolution](./phase-02-link-resolution.md) | Completed |
| 3 | [watch-reconciliation](./phase-03-watch-reconciliation.md) | Completed |
| 4 | [optional-graph](./phase-04-optional-graph.md) | Completed |
| 5 | [verification-and-delivery](./phase-05-verification-and-delivery.md) | Completed |

## Dependencies

- [[260714-1128-verify-harness-integrity/plan|Plan]] is completed. It owns the
  shared read-only scanner,
  deterministic renderer, and `index check` CI gate; this Plan subsequently
  adds publication and never weakens the read-only gate.
- [[260714-0033-file-based-agent-harness/plan|Plan]] supplies the existing CLI
  command registry, repository discovery, and validated atomic-write boundary.
- [[DEC-001-cli-command-parsing|DEC-001]] governs strict CLI grammar; [[DEC-002-minimal-file-mutations|DEC-002]] governs every index publication.
- [[DEC-003-index-watch-and-graph-runtime|DEC-003]] is approved and governs
  Phases 3 and 4.
