---
schema_version: 1
title: Manage repository harness documents with the Harness CLI
relationships:
  specs: []
  decisions: []
  plans:
    - "[[260714-0033-file-based-agent-harness/plan]]"
  reports: []
  rules: []
  features: []
  source_paths:
    - docs/harness/plans/260714-0033-file-based-agent-harness/phase-04-cli-core-and-validation.md
    - docs/harness/plans/260714-0033-file-based-agent-harness/phase-05-index-watcher-and-knowledge-graph.md
type: feature
id: FEAT-001
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Product Authority
---

# FEAT-001: Manage repository harness documents with the Harness CLI

## Introduction

**Purpose:** Give repository contributors a deterministic command-line interface for creating, validating, relating, indexing, and safely maintaining the Markdown documents that form the repository harness.

**In scope:**

- Initialize the canonical `docs/harness/` structure from an explicit allowlist.
- Create, list, show, rename, deprecate, and safely delete Feature documents.
- Scaffold Spec, Decision, Report, and Rule documents from canonical templates.
- Validate one document, one artifact type, or the complete harness.
- Build and check the derived index, reconcile it after filesystem changes, and expose wikilink and backlink problems.
- List recurring self-improvement candidates without automatically changing project Rules.
- Check or explicitly build the optional Graphify view.
- Preview and remove only documented generated or cache outputs.

**Out of scope:**

- Calling Claude, Codex, Cursor, Antigravity, AGY, or another AI agent.
- Synchronizing runtime adapters or implementing the complete Phase 6 doctor diagnostics.
- Automatically running Git, network, verification, commit, push, deployment, or Rule approval actions.
- Persisting canonical state in SQLite, another hidden database, or a separate trace store.

### Evidence classification

- **Observed:** Phase 4 defines the CLI commands, monotonic allocation, validation, safe mutation, cleanup, and prohibition on launching agents.
- **Observed:** Phase 5 defines deterministic index generation, stale-index checks, watcher reconciliation, local wikilink resolution, and optional Graphify integration.
- **Inferred and approved:** These Phase 4 and Phase 5 behaviors form one business capability because contributors use them as one document-maintenance lifecycle.
- **Inferred and approved:** Repository Contributor, Repository Maintainer, and CI System are the BA actors that interact with this capability.
- **TBD implementation detail:** The concrete lock primitive, watcher debounce duration, and temporary sibling naming convention will be selected during planning without changing this business boundary.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Maintain valid and navigable harness documents | Run explicit CLI commands and author document content |
| Repository Maintainer | Business role | Preserve repository-wide document integrity | Review lifecycle changes and resolve reported conflicts |
| CI System | External system | Prevent inconsistent harness state from being promoted | Run deterministic validation and stale-index checks |

### User needs

- A Repository Contributor needs repeatable scaffolding so new artifacts follow the repository contract without copying templates manually.
- A Repository Contributor needs actionable validation before handing work to another workflow or person.
- A Repository Maintainer needs rename, retirement, and cleanup operations that do not silently break relationships or remove authored documents.
- A CI System needs deterministic exit codes and byte-stable derived output so inconsistent state can block promotion.

### Preconditions

#### General

- A repository workspace exists and is accessible to the CLI.
- The caller has permission to read the paths required by the requested command.
- The command and its arguments belong to the supported Harness command contract.

#### Commands other than `harness init`

- The Harness has been initialized in the repository.
- `docs/harness/index.md` exists and declares a schema version supported by the CLI.

#### Mutation commands

- The caller has permission to write to the affected Harness paths.
- A command that renames, deprecates, or deletes an artifact identifies an existing unambiguous target.
- Canonical templates are available when the command creates an artifact.

Graphify availability is not a precondition because it is an optional capability with explicit outcomes.

### Trigger

A Repository Contributor, Repository Maintainer, or CI System explicitly invokes one supported Harness CLI command with its required arguments.

### Main flow

1. **Actor:** The actor invokes one supported Harness command with explicit arguments. **System:** The system identifies the repository root and recognizes the requested command without performing hidden actions.
2. **Actor:** The actor supplies the target or input required by the command. **System:** The system checks the applicable general, initialization, permission, schema, and target preconditions before changing repository state.
3. **Actor:** The actor authorizes only the requested operation by invoking that command. **System:** The system performs the requested read-only behavior or prepares the allowed mutation; when an ID is required, it reserves the next monotonic sequence before publication.
4. **Actor:** The actor waits for the requested operation to complete. **System:** For a mutation, the system validates the complete staged result and publishes every affected file atomically, or publishes none of them.
5. **Actor:** The actor receives the requested documents or derived result. **System:** If canonical Harness documents changed, the system rebuilds the derived index; otherwise it makes no unrelated repository change.
6. **Actor:** The actor reviews the command outcome. **System:** The system reports deterministic output or actionable diagnostics and returns the corresponding stable exit code.

### Alternative flows

- **A1 — Initialize the Harness.** Source step: 3. Condition: the requested command is `harness init`. Behavior: the system idempotently creates only the documented Harness scaffold and bootstrap files; existing user-authored content remains unchanged. Resume at step: 5.
- **A2 — Create an artifact.** Source step: 3. Condition: the Contributor requests a supported artifact creation command. Behavior: the system reserves the next monotonic ID when required and renders the canonical template at the canonical path. Resume at step: 4.
- **A3 — Read or validate documents.** Source step: 3. Condition: the Contributor requests list, show, validation, or index-check behavior. Behavior: the system reads and evaluates the requested scope without changing canonical documents; `index check` constructs the expected logical index in memory. Resume at step: 6.
- **A4 — Rename a Feature.** Source step: 3. Condition: the Maintainer requests a new title or slug while preserving the Feature identity. Behavior: the system preserves the ID and stages the renamed file together with every resolvable inbound wikilink rewrite. Resume at step: 4.
- **A5 — Retire or delete a Feature.** Source step: 3. Condition: the Maintainer requests deprecation or deletion of an existing Feature. Behavior: deprecation preserves the ID and relationships; deletion proceeds only when backlink safety rules and explicit authorization are satisfied. Resume at step: 4.
- **A6 — Reconcile manual edits.** Source step: 3. Condition: the Contributor explicitly runs `harness watch`. Behavior: the system performs a full rebuild on startup, debounces related events, ignores its own index replacement, and publishes complete valid snapshots while the command remains active. Ends with: graceful watcher shutdown and the last valid index preserved.
- **A7 — Inspect or build the optional graph.** Source step: 3. Condition: the Contributor explicitly requests `harness graph check` or `harness graph build`. Behavior: `graph check` reports availability and a missing-tool warning without invalidating the Harness; `graph build` invokes Graphify and propagates its outcome. Resume at step: 6.
- **A8 — Preview or perform cleanup.** Source step: 3. Condition: the Maintainer requests `harness clean`, with or without `--dry-run`. Behavior: dry-run lists allowlisted generated paths without mutation; confirmed cleanup removes only those generated or cache paths. Resume at step: 6.
- **A9 — Run the CI correctness gate.** Source step: 3. Condition: the CI System requests full validation and `harness index check`. Behavior: the system validates canonical documents, builds the expected index in memory, compares logical content, and reports every inconsistency. Resume at step: 6.

### Exception flows

- **E1 — Command precondition failure.** Source step: 2. Failure: the repository, initialization state, schema version, permissions, command arguments, or target does not satisfy the requested command. Handling: report the failed precondition and return a nonzero exit code before mutation begins. Prohibited: guessing a target or partially executing the command. Failure postcondition: the repository remains unchanged.
- **E2 — Invalid staged result.** Source step: 4. Failure: schema, filename, content, relationship, wikilink, or cross-file validation fails. Handling: report each diagnostic with its source and return a nonzero exit code. Prohibited: silently repairing user-authored content or publishing part of the staged mutation. Failure postcondition: the last valid repository state remains visible.
- **E3 — Referenced Feature deletion blocked.** Source step: A5. Failure: the Maintainer requests default hard deletion of a Feature with inbound backlinks. Handling: reject deletion and list the referring documents so the Maintainer can deprecate the Feature or explicitly resolve the references. Prohibited: leaving broken links without explicit force authorization. Failure postcondition: the Feature and its ID remain unchanged.
- **E4 — Concurrent mutation.** Source step: 3. Failure: another process owns the repository mutation lock when this command requests a mutation. Handling: report the conflict and return a nonzero exit code without publishing staged changes. Prohibited: interleaving repository writes. Failure postcondition: no partial output is visible.
- **E5 — Stale or inconsistent index.** Source step: A9. Failure: the expected in-memory logical index differs from the persisted index or canonical documents are invalid. Handling: report the exact inconsistent sources and return a nonzero exit code. Prohibited: treating watcher activity as the correctness boundary. Failure postcondition: CI does not promote the inconsistent state.
- **E6 — Invalid edit during watch.** Source step: A6. Failure: a changed document cannot be parsed or validated. Handling: report the error and retain the last valid index until a later valid edit can be reconciled. Prohibited: replacing the valid index with a partial or invalid snapshot. Failure postcondition: canonical authored content remains available and the last valid index remains published.
- **E7 — Graph build failure.** Source step: A7. Failure: an explicitly requested `graph build` cannot start Graphify or Graphify returns a failure. Handling: propagate the build failure while preserving canonical Markdown and index navigation. Prohibited: converting optional graph output into canonical Harness state or failing unrelated validation. Failure postcondition: no canonical Harness data is lost.

### Postconditions

- **Read-only success:** The requested information or validation result is returned and the repository remains unchanged.
- **Mutation success:** Every affected file is validated and atomically visible, reserved IDs remain consumed, and the derived index reflects the resulting canonical documents.
- **Correctness-gate success:** Canonical documents are valid and the persisted logical index matches the expected in-memory index.
- **Watcher success:** Every published index snapshot is complete and valid, and graceful shutdown preserves the last valid snapshot.
- **Failure:** The command reports actionable diagnostics and a nonzero exit code; an unpublished mutation leaves the last valid authored documents and index unchanged.

## Requirements

- **FR-001 — Initialization [Observed]:** When a Contributor runs `harness init`, the system shall idempotently create only the documented Harness directories and bootstrap files that do not already exist.
- **FR-002 — Artifact creation [Observed]:** When a Contributor requests a supported artifact, the system shall render the corresponding canonical template using a valid canonical filename and path.
- **FR-003 — Monotonic allocation [Observed]:** When creating an ID-bearing artifact, the system shall reserve the next sequence before publishing the file and shall never decrement or reuse a reserved ID.
- **FR-004 — Artifact discovery [Observed]:** The system shall let a Contributor list and show Features without modifying repository state.
- **FR-005 — Validation [Observed]:** The system shall validate frontmatter, filenames, statuses, required content, relationships, wikilinks, and cross-file invariants for a selected path or the complete Harness.
- **FR-006 — Safe rename [Observed]:** When a Feature slug changes, the system shall preserve its ID and atomically update the canonical filename and every resolvable inbound wikilink, or leave the repository unchanged.
- **FR-007 — Safe retirement [Observed]:** The system shall support deprecation and shall reject hard deletion of a referenced Feature unless the caller explicitly authorizes the resulting risk.
- **FR-008 — Derived index [Observed]:** The system shall build a deterministically ordered Markdown index containing counters, catalogs, relationships, backlinks, broken or ambiguous links, consistency findings, TBDs, and recurring self-improvement candidates.
- **FR-009 — Correctness check [Observed]:** The system shall build the expected index in memory and return a nonzero exit code when the persisted logical index is stale, invalid, or inconsistent.
- **FR-010 — Watch reconciliation [Observed]:** The system shall reconcile relevant Markdown changes without reacting indefinitely to its own index replacement and shall retain the last valid index while an edit is invalid.
- **FR-011 — Self-improvement candidates [Observed]:** The system shall group recurring evidence by `recurrence_key` for human review without automatically creating, approving, or changing a Rule.
- **FR-012 — Optional graph [Observed]:** The system shall resolve wikilinks locally and shall invoke Graphify only after an explicit graph command.
- **FR-013 — Safe cleanup [Observed]:** The system shall support a dry run and remove only documented generated or cache paths, never canonical authored Markdown.
- **FR-014 — Explicit diagnostics [Inferred and approved]:** Every command shall report a stable success or failure result with enough context for the invoking actor to take the next action.
- **BR-001 [Observed]:** Canonical durable Harness state consists of readable files under `docs/harness/`; the generated index is derived state, and no hidden database or trace store may become authoritative.
- **BR-002 [Observed]:** Feature IDs match `FEAT-XXX`, remain immutable, are unique, increase monotonically, and are never reused after deprecation or deletion.
- **BR-003 [Observed]:** The CLI shall not spawn or interact with an AI agent and shall not silently run Git, network, verification, commit, push, or deployment actions.
- **BR-004 [Observed]:** Normal mutations are single-writer operations restricted to repository-contained allowlisted paths.
- **BR-005 [Observed]:** Watcher convenience does not replace `harness index check` as the correctness gate.
- **BR-006 [Observed]:** Graphify output is optional, ignored, and disposable; canonical navigation must continue to work through Markdown and wikilinks.
- **NFR-001 — Determinism [Observed]:** Equivalent logical input shall produce byte-stable ordered output using LF line endings and repository-relative POSIX paths; generated timestamps shall not cause equality drift.
- **NFR-002 — Atomicity [Observed]:** A mutation shall stage and validate all affected sibling files before atomic publication and shall expose no known partial result after validation or lock failure.
- **NFR-003 — Safety [Observed]:** Repository-root discovery, real-path containment, and symlink checks shall prevent writes outside allowed paths.
- **NFR-004 — Portability [Observed]:** Supported behavior shall be verified on macOS, Linux, and Windows, including bounded handling of transient Windows rename conflicts.
- **NFR-005 — Responsiveness [Observed]:** Watcher bursts shall be coalesced so one logical edit sequence produces a bounded reconciliation rather than an unbounded write loop.

## Acceptance

- [ ] `harness init` is idempotent and creates no path outside its documented allowlist.
- [ ] A command other than `harness init` rejects an uninitialized or unsupported Harness before making a repository change.
- [ ] Read-only commands return their requested result without changing repository files.
- [ ] Consecutive Feature creation allocates `FEAT-001-*`, then `FEAT-002-*`; deleting or deprecating the first Feature never makes `FEAT-001` available again.
- [ ] Malformed, duplicate, or filename/frontmatter-mismatched IDs produce actionable diagnostics and a nonzero exit code.
- [ ] A successful rename preserves the Feature ID and rewrites all inbound wikilinks; any validation failure leaves every affected file unchanged.
- [ ] A referenced Feature cannot be hard-deleted by default.
- [ ] Index output is byte-stable for unchanged logical content and identifies exact sources for backlinks, broken links, ambiguous links, and stale state.
- [ ] Insert, delete, move, rename, rapid edit bursts, and the watcher's own index replacement reconcile without an infinite loop.
- [ ] `harness clean --dry-run` lists exactly the allowlisted output and removes nothing.
- [ ] Ordinary commands never start an agent process or perform hidden external actions.
- [ ] Missing Graphify is a non-invalidating warning for `graph check`; an explicitly requested `graph build` propagates its own failure; deleting Graphify output loses no canonical Harness data.

**Scenario: reject a command before initialization**
Given a repository does not contain an initialized Harness
When the Repository Contributor runs `harness feature list`
Then the command identifies the missing initialization precondition
And returns a nonzero exit code
And creates or changes no repository file.

**Scenario: create the next Feature**
Given the index reserves the next Feature sequence `3`
When the Repository Contributor creates a Feature titled `Checkout`
Then `docs/harness/features/FEAT-003-checkout.md` is published from the canonical template
And the next Feature sequence becomes `4` before the new file is visible.

**Scenario: rename without breaking relationships**
Given `FEAT-003-checkout.md` has inbound wikilinks
When the Repository Contributor renames its title to `Purchase`
Then the Feature becomes `FEAT-003-purchase.md` with the same frontmatter ID
And every inbound wikilink targets the new basename
And either the complete valid change is published or no affected file changes.

**Scenario: CI rejects a stale index**
Given canonical Harness Markdown changed after the last index build
When the CI System runs `harness index check`
Then the command identifies the inconsistent sources
And returns a nonzero exit code.

**Scenario: invalid edit during watch**
Given `harness watch` has a valid current index
When a Contributor temporarily saves an invalid Feature document
Then the system reports the validation problem
And preserves the last valid index
And publishes a new complete snapshot only after the document becomes valid.

**Scenario: optional Graphify is missing**
Given canonical Markdown and wikilinks are valid
And Graphify is not installed
When the Repository Contributor checks graph availability
Then the system reports a warning
And Harness validation and index navigation remain usable.

**Scenario: an explicit graph build fails**
Given canonical Markdown and wikilinks are valid
And Graphify cannot complete a graph build
When the Repository Contributor explicitly runs `harness graph build`
Then the command propagates the Graphify failure
And canonical Markdown and the derived index remain unchanged.

## Relationships

- Plans: [[260714-0033-file-based-agent-harness/plan]]
- Source: `docs/harness/plans/260714-0033-file-based-agent-harness/phase-04-cli-core-and-validation.md`
- Source: `docs/harness/plans/260714-0033-file-based-agent-harness/phase-05-index-watcher-and-knowledge-graph.md`
