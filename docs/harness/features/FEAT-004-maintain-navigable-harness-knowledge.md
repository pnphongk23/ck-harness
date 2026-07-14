---
schema_version: 1
type: feature
id: FEAT-004
title: Maintain navigable Harness knowledge
status: proposed
created: 2026-07-14
relationships:
  specs: []
  decisions:
    - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
  plans:
    - "[[260714-1147-maintain-navigable-harness-knowledge/plan|Plan]]"
  reports:
    - "[[REP-003-maintain-navigable-harness-knowledge|REP-003]]"
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/RULES.md
---

# FEAT-004: Maintain navigable Harness knowledge

## Introduction

**Purpose:** Let repository contributors navigate Harness artifacts and their relationships through a deterministic derived index that can be rebuilt, continuously reconciled, and optionally visualized.

**In scope:**

- Build a complete derived catalog of Harness artifacts, relationships, backlinks, and unresolved links.
- Reconcile the derived index after relevant authored Markdown changes while watch mode is explicitly active.
- Resolve local wikilinks and aliases deterministically without guessing ambiguous targets.
- Check availability of and explicitly build an optional graph view.
- Preserve Markdown and wikilinks as canonical navigation when optional visualization is unavailable.

**Out of scope:**

- Treating the derived index or graph output as canonical authored state.
- Using watch mode as the CI or handoff correctness gate.
- Automatically changing Rules from recurring evidence.
- Sending repository content to an external service without explicit permission.

### Evidence classification

- **Observed:** The approved split assigns index building, watch reconciliation, backlinks, wikilink resolution, and optional graph behavior to one navigation capability.
- **Observed:** Work Item 5 requires deterministic index generation, preservation of the last valid snapshot, and optional Graphify degradation.
- **Inferred:** Index, watcher, and graph behaviors share one user outcome because each provides a view over the same authored Harness knowledge and relationships.
- **TBD:** Watch timing and the selected local watcher mechanism are implementation details governed downstream.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Find relevant Harness artifacts and understand their relationships | Request index or graph views and correct authored link issues |
| Repository Maintainer | Business role | Keep repository navigation complete and trustworthy | Rebuild or monitor derived navigation after repository changes |
| Graph visualization utility | External system | Render an optional local relationship view | Return availability and explicit build outcomes |

### User needs

- A Contributor needs one deterministic catalog with forward links, backlinks, and unresolved relationship evidence.
- A Maintainer needs manual edits to reconcile into a complete index without infinite self-updates.
- A Contributor needs optional visualization failure to leave canonical Markdown navigation usable.

### Preconditions

- The Harness is initialized and its canonical documents are readable.
- An index publication request has permission to update the CLI-owned derived index.
- Optional graph availability is not required unless the actor explicitly requests a graph build.

### Trigger

A Repository Contributor or Repository Maintainer requests an index build, starts watch reconciliation, or explicitly checks or builds the optional graph view.

### Main flow

1. **Actor:** The actor requests a derived knowledge operation. **System:** The system discovers the current canonical Harness documents and recognizes the requested navigation scope.
2. **Actor:** The actor waits for the view. **System:** The system evaluates the complete logical catalog, relationships, backlinks, aliases, and unresolved references in deterministic order.
3. **Actor:** The actor requests publication through the selected operation. **System:** The system publishes a complete valid derived index only when logical content changed.
4. **Actor:** The actor navigates the result. **System:** The system exposes canonical document links and relationship evidence without changing authored Harness content.

### Alternative flows

- **A1 — Reconcile while watching.** Source step: 1. Condition: the Maintainer explicitly starts watch mode. Behavior: the system performs an initial full reconciliation, coalesces related change signals, ignores its own derived publication, and publishes only complete valid snapshots until stopped. Ends with: graceful shutdown preserving the last valid index.
- **A2 — Check graph availability.** Source step: 1. Condition: the Contributor requests a graph availability check. Behavior: the system reports whether the optional local utility is usable and treats absence as a warning. Resume at step: 4.
- **A3 — Build the optional graph.** Source step: 1. Condition: the Contributor explicitly requests graph generation. Behavior: the system supplies the local Harness relationship view to the optional utility and reports its outcome. Resume at step: 4.
### Exception flows

- **E1 — Invalid canonical document during build.** Source step: 2. Failure: the Harness cannot produce one complete valid logical view. Handling: report the invalid source and withhold the new derived publication. Prohibited: publishing a partial or misleading index. Failure postcondition: authored content remains unchanged and the last valid index is preserved.
- **E2 — Invalid edit during watch.** Source step: A1. Failure: a relevant edit cannot be parsed or reconciled. Handling: report the edit and continue observing for a later valid state. Prohibited: replacing the last valid index with an invalid snapshot. Failure postcondition: the last valid index remains navigable.
- **E3 — Ambiguous relationship target.** Source step: 2. Failure: a local wikilink resolves to more than one candidate. Handling: report the ambiguity and each candidate. Prohibited: guessing a target. Failure postcondition: the unresolved relationship remains visible for correction.
- **E4 — Graph build unavailable or failed.** Source step: A3. Failure: the optional graph utility cannot start or returns failure. Handling: report the graph-specific failure. Prohibited: invalidating or deleting canonical Markdown navigation. Failure postcondition: the derived Markdown index remains usable.
- **E5 — Watch coverage degraded.** Source step: A1. Failure: the watched root becomes unavailable or change observation cannot continue reliably. Handling: report degraded coverage and direct the Maintainer to an explicit rebuild or correctness check. Prohibited: silently claiming current coverage. Failure postcondition: the last valid index is preserved.

### Postconditions

- **Index-build success:** One complete deterministic derived index represents the current valid logical Harness state.
- **Watch success:** Every published snapshot is complete and valid, and graceful shutdown preserves the last valid snapshot.
- **Graph success:** Optional graph output reflects the requested local relationship view and remains disposable.
- **Failure:** Canonical authored Markdown is unchanged and no incomplete derived view replaces the last valid index.

## Requirements

- **FR-001 — Derived catalog [Observed]:** The system shall build a deterministic index of Harness artifacts, forward relationships, backlinks, and unresolved links.
- **FR-002 — Deterministic resolution [Observed]:** The system shall resolve exact basenames and supported aliases locally and shall report ambiguous or broken links without guessing.
- **FR-003 — Complete publication [Observed]:** The system shall publish only complete valid index snapshots and shall avoid rewriting unchanged logical content.
- **FR-004 — Watch reconciliation [Observed]:** Explicit watch mode shall perform initial full reconciliation, coalesce related changes, suppress self-publication loops, and preserve the last valid index during invalid edits.
- **FR-005 — Optional graph [Observed]:** The system shall report optional graph availability and shall invoke graph generation only on an explicit actor request.
- **BR-001 [Observed]:** Canonical Harness knowledge remains authored Markdown; the index and graph are derived and replaceable views.
- **BR-002 [Observed]:** Watch mode is a convenience and shall not replace explicit integrity verification for CI or handoff.
- **BR-003 [Observed]:** Repository content shall remain local unless the actor explicitly authorizes external transmission.
- **NFR-001 — Determinism [Observed]:** Equivalent logical input shall produce byte-stable ordered index content independent of generated timestamps.
- **NFR-002 — Responsiveness [Observed]:** A bounded burst of related edits shall produce bounded reconciliation rather than an unbounded write loop.
- **NFR-003 — Resilience [Observed]:** Invalid edits and optional graph failures shall preserve the last valid canonical navigation outcome.

## Acceptance

- [ ] A complete valid Harness produces a deterministic catalog with forward links and backlinks.
- [ ] Broken and ambiguous relationships identify their exact source without guessing a target.
- [ ] Rebuilding unchanged logical content produces no index drift.
- [ ] Watch startup, edits, moves, deletes, rename bursts, and self-publication reconcile without an infinite loop.
- [ ] An invalid watched edit preserves the last valid index and reports the source.
- [ ] Missing optional graph support is a warning; an explicitly requested build propagates its own outcome.
- [ ] Removing graph output loses no canonical Harness knowledge.

**Scenario: build a navigable index**
Given all canonical Harness documents are valid
When the Repository Maintainer builds the index
Then every artifact and resolvable relationship appears in deterministic order
And unresolved links identify their sources.

**Scenario: preserve navigation during an invalid edit**
Given watch mode has published a valid index
When a Contributor saves an invalid Harness document
Then the invalid source is reported
And the last valid index remains published
And a later valid edit can be reconciled.

**Scenario: degrade gracefully without graph support**
Given canonical Markdown navigation is valid and the optional graph utility is absent
When the Contributor checks graph availability
Then the absence is reported as a warning
And the Harness remains navigable through Markdown and wikilinks.

## Relationships

- Decision: [[DEC-003-index-watch-and-graph-runtime|DEC-003]]
- Decision: [[DEC-006-graphify-directory-extraction-boundary|DEC-006]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]], [[FEAT-003-verify-harness-integrity|FEAT-003]]
- Plan: [[260714-1147-maintain-navigable-harness-knowledge/plan|Plan]]
- Source: `docs/harness/RULES.md`
