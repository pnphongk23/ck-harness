---
schema_version: 1
type: feature
id: FEAT-001
title: Manage the Harness artifact lifecycle
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Product Authority
relationships:
  specs: []
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/plans/260714-0033-file-based-agent-harness/work-item-04-cli-core-and-validation.md
---

# FEAT-001: Manage the Harness artifact lifecycle

## Introduction

**Purpose:** Let repository contributors initialize a Harness workspace and safely create, inspect, rename, retire, delete, and clean Harness artifacts.

**In scope:**

- Initialize the canonical Harness document structure without replacing existing authored content.
- Scaffold Feature, Spec, Decision, Report, and Rule artifacts from their canonical forms.
- List and show Feature artifacts.
- Rename, deprecate, and explicitly delete Features while preserving identity and relationship safety.
- Preview and remove only documented generated or cache outputs.

**Out of scope:**

- Validating Harness correctness or reporting repository health.
- Building, watching, or visualizing the derived knowledge index.
- Synchronizing Harness access across agent runtimes.
- Running agents, Git, network, verification, commit, push, release, or deployment actions.

### Evidence classification

- **Observed:** The approved split retains initialization, artifact scaffolding, Feature lifecycle operations, and safe cleanup in FEAT-001.
- **Observed:** Repository Rules require immutable monotonic IDs, safe rename and retirement, single-writer mutations, atomic writes, and preservation of user changes.
- **Inferred:** These behaviors form one capability because each changes or inspects the lifecycle state of authored Harness artifacts.
- **Observed:** DEC-002 defers automatic crash recovery and selects validated sibling writes with best-effort rollback for handled failures.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Create and inspect contract-compliant Harness artifacts | Supply artifact intent and review generated content |
| Repository Maintainer | Business role | Change artifact lifecycle state without losing identity or relationships | Authorize rename, retirement, deletion, and cleanup operations |

### User needs

- A Repository Contributor needs repeatable initialization and scaffolding without manually copying canonical documents.
- A Repository Maintainer needs lifecycle operations that do not silently overwrite authored content, reuse identities, or break relationships.
- A Repository Maintainer needs cleanup to distinguish disposable output from canonical Harness documents.

### Preconditions

- A repository workspace exists and the actor can access the requested paths.
- Commands other than initialization operate on an initialized Harness with a supported schema version.
- A lifecycle mutation identifies an existing unambiguous target and the actor can write every affected Harness path.

### Trigger

A Repository Contributor or Repository Maintainer explicitly requests one supported artifact lifecycle operation.

### Main flow

1. **Actor:** The actor requests an artifact lifecycle operation with its required inputs. **System:** The system identifies the repository and checks initialization, schema, permissions, and target preconditions.
2. **Actor:** The actor reviews or supplies the artifact intent. **System:** The system determines the exact authored and generated paths affected by only that operation.
3. **Actor:** The actor confirms the requested operation by invoking it. **System:** The system prepares the requested result; when a new identity is required, it reserves the next monotonic ID before publication.
4. **Actor:** The actor waits for completion. **System:** The system validates the complete staged result and publishes every affected file safely, or publishes none of the requested mutation.
5. **Actor:** The actor reviews the outcome. **System:** The system reports the resulting artifact identity, paths, and any action required from the actor.

### Alternative flows

- **A1 — Initialize a Harness.** Source step: 3. Condition: the actor requests initialization. Behavior: the system creates only missing allowlisted Harness paths and preserves all existing content. Resume at step: 5.
- **A2 — Create an artifact.** Source step: 3. Condition: the actor requests a supported artifact type. Behavior: the system renders its canonical form at the canonical path and reserves an immutable ID when required. Resume at step: 4.
- **A3 — Inspect Features.** Source step: 3. Condition: the actor requests a Feature list or one Feature. Behavior: the system returns the requested information without modifying repository state. Resume at step: 5.
- **A4 — Rename a Feature.** Source step: 3. Condition: the Maintainer supplies a new title or slug. Behavior: the system preserves the Feature ID and prepares the filename and resolvable inbound relationship updates as one change. Resume at step: 4.
- **A5 — Retire or delete a Feature.** Source step: 3. Condition: the Maintainer requests deprecation or explicit deletion. Behavior: deprecation preserves the artifact and identity; deletion proceeds only after relationship risks are disclosed and the required authorization is present. Resume at step: 4.
- **A6 — Preview or perform cleanup.** Source step: 3. Condition: the Maintainer requests cleanup. Behavior: preview lists only allowlisted disposable paths; confirmed cleanup removes only those paths. Resume at step: 5.

### Exception flows

- **E1 — Lifecycle precondition failure.** Source step: 1. Failure: repository, initialization, schema, permission, argument, or target requirements are not satisfied. Handling: report the failed precondition before mutation. Prohibited: guessing a target or partially performing the request. Failure postcondition: the repository remains unchanged.
- **E2 — Existing content conflict.** Source step: 3. Failure: the requested output would overwrite user-authored or unowned content. Handling: identify the conflicting path and reject the mutation. Prohibited: silently replacing or merging the content. Failure postcondition: existing content remains unchanged.
- **E3 — Invalid staged result.** Source step: 4. Failure: the complete proposed artifact set does not satisfy its governing contract. Handling: report actionable diagnostics and discard the unpublished result. Prohibited: publishing only part of the mutation. Failure postcondition: the last valid repository state remains visible.
- **E4 — Referenced Feature deletion blocked.** Source step: A5. Failure: a Feature selected for default deletion has inbound relationships. Handling: reject deletion and list the referring artifacts. Prohibited: breaking relationships without explicit authorization. Failure postcondition: the Feature and its identity remain unchanged.
- **E5 — Concurrent lifecycle mutation.** Source step: 3. Failure: another Harness writer owns the mutation boundary. Handling: report the conflict and reject this mutation. Prohibited: interleaving writes. Failure postcondition: no output from this request is published.

### Postconditions

- **Initialization success:** The canonical Harness structure exists and previously authored content is unchanged.
- **Creation success:** One canonical artifact exists with a permanently reserved identity when applicable.
- **Lifecycle success:** The complete requested state and relationship changes are visible together.
- **Read-only success:** The requested information is returned without repository changes.
- **Failure:** No unpublished partial mutation is presented as success and actionable diagnostics identify the next actor action.

## Requirements

- **FR-001 — Initialization [Observed]:** The system shall idempotently create only missing paths from the documented Harness initialization allowlist.
- **FR-002 — Artifact creation [Observed]:** The system shall scaffold each supported artifact type from its canonical form at its canonical path.
- **FR-003 — Monotonic allocation [Observed]:** The system shall reserve each new ID-bearing artifact's next sequence before publication and shall never decrement or reuse a reserved ID.
- **FR-004 — Feature discovery [Observed]:** The system shall let an actor list and show Features without modifying repository state.
- **FR-005 — Safe rename [Observed]:** A Feature rename shall preserve its ID and update every resolvable inbound wikilink as one validated lifecycle change.
- **FR-006 — Safe retirement [Observed]:** The system shall support deprecation and shall block default deletion when inbound relationships exist.
- **FR-007 — Safe cleanup [Observed]:** Cleanup shall support preview and remove only documented disposable outputs, never canonical authored Markdown.
- **BR-001 [Observed]:** Canonical durable Harness state shall remain readable under `docs/harness/`; no hidden database or completed-operation trace may become authoritative.
- **BR-002 [Observed]:** Artifact identities are immutable and remain reserved after deprecation or deletion.
- **BR-003 [Observed]:** A lifecycle operation shall affect only its disclosed repository-contained allowlisted paths and shall preserve unrelated user changes.
- **BR-004 [Observed]:** Harness lifecycle operations shall not invoke an AI agent or silently perform Git, network, verification, release, or deployment actions.
- **NFR-001 — Determinism [Observed]:** Equivalent logical inputs shall produce byte-stable canonical output using repository-relative POSIX paths and LF line endings.
- **NFR-002 — Mutation safety [Observed]:** A mutation shall validate its complete staged result before publication and shall not report a known partial result as success.
- **NFR-003 — Portability [Observed]:** The lifecycle behavior shall be consistent on supported macOS, Linux, and Windows environments.

## Acceptance

- [ ] Initialization is idempotent, creates only allowlisted paths, and preserves existing content.
- [ ] Supported artifacts are scaffolded at canonical paths with canonical content structure.
- [ ] ID allocation is monotonic and no deprecated or deleted ID becomes available again.
- [ ] Feature list and show operations leave repository files unchanged.
- [ ] Rename preserves Feature identity and updates inbound wikilinks as one validated change.
- [ ] Referenced Features cannot be deleted by default.
- [ ] Cleanup preview changes nothing, and confirmed cleanup cannot remove canonical authored Markdown.
- [ ] A failed or conflicting mutation does not publish a partial requested result.

**Scenario: initialize without overwriting authored content**
Given a repository contains some existing Harness files
When the Repository Contributor initializes the Harness
Then only missing allowlisted paths are created
And every existing file remains unchanged.

**Scenario: allocate the next Feature identity**
Given the next Feature sequence is `6`
When the Repository Contributor creates a Feature
Then the new Feature receives `FEAT-006`
And the sequence advances before the Feature is published.

**Scenario: rename without breaking relationships**
Given a Feature has resolvable inbound wikilinks
When the Repository Maintainer renames it
Then its ID is unchanged
And all affected paths and links are published together or remain unchanged.

**Scenario: reject referenced deletion**
Given another artifact links to a Feature
When the Repository Maintainer requests default deletion
Then deletion is rejected
And the referring artifact is identified.

## Relationships

- Decisions: [[DEC-001-cli-command-parsing|DEC-001]], [[DEC-002-minimal-file-mutations|DEC-002]]
- Related Features: [[FEAT-003-verify-harness-integrity|FEAT-003]], [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]], [[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]
- Plan: [[260714-0033-file-based-agent-harness/plan|Plan]]
- Source: `docs/harness/RULES.md`
- Source: `docs/harness/plans/260714-0033-file-based-agent-harness/work-item-04-cli-core-and-validation.md`
