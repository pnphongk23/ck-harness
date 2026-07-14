---
schema_version: 1
type: feature
id: FEAT-005
title: Provide Harness access across agent runtimes
status: proposed
created: 2026-07-14
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/SKILL-PORTS.md
    - docs/harness/plans/260714-0033-file-based-agent-harness/phase-06-runtime-adapters-and-doctor.md
---

# FEAT-005: Provide Harness access across agent runtimes

## Introduction

**Purpose:** Let repository contributors use the same canonical Harness workflows from supported agent runtimes without duplicating workflow authority or overwriting user-owned runtime configuration.

**In scope:**

- Make canonical Harness skills discoverable directly where a supported runtime can use them.
- Synchronize thin runtime-specific adapters where direct discovery is unavailable.
- Check adapters for absence, drift, broken routing, and conflicts with user-owned configuration.
- Include runtime-access findings in consolidated Harness health diagnostics.
- Preview adapter changes and remove only obsolete Harness-owned adapter output.

**Out of scope:**

- Launching or orchestrating any agent runtime.
- Duplicating canonical workflow or template bodies into adapters.
- Changing user-global runtime configuration.
- Overwriting unowned repository configuration or resolving product behavior differently per runtime.

### Evidence classification

- **Observed:** The approved split assigns adapter synchronization, adapter checks, and runtime-specific health diagnostics to a dedicated capability.
- **Observed:** Phase 6 defines direct discovery for Codex and Antigravity and thin adapters for Claude and Cursor while preserving user-owned configuration.
- **Inferred:** Direct discovery and generated adapters are alternative delivery paths for one business outcome: consistent access to the same canonical Harness workflows.
- **TBD:** Runtime discovery contracts may evolve; supported adapter formats and fingerprints remain downstream compatibility details.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Invoke the same Harness workflows from a preferred supported runtime | Use repository-local runtime access and report incorrect routing |
| Repository Maintainer | Business role | Keep runtime access current without losing custom configuration | Preview, synchronize, and verify Harness-owned adapters |
| Supported agent runtime | External system | Discover and present repository-local Harness workflows | Follow canonical entrypoints or generated thin adapters |

### User needs

- A Contributor needs workflow meaning and approval boundaries to remain consistent across supported runtimes.
- A Maintainer needs adapter drift to be detectable and repairable without manually duplicating canonical documents.
- A Maintainer needs user-owned runtime configuration to remain untouched when adapter synchronization encounters a conflict.

### Preconditions

- The repository contains readable canonical Harness skill, workflow, and template sources.
- The requested runtime belongs to the supported runtime contract.
- Adapter synchronization has permission to write only Harness-owned repository-local adapter paths.

### Trigger

A Repository Maintainer requests adapter synchronization or checking, or a Contributor accesses a Harness workflow through a supported agent runtime.

### Main flow

1. **Actor:** The Maintainer requests runtime-access synchronization or verification. **System:** The system identifies canonical workflow sources, supported runtimes, and existing runtime configuration ownership.
2. **Actor:** The Maintainer reviews the proposed or current access paths. **System:** The system distinguishes direct discovery from required thin adapters and identifies missing, stale, or obsolete Harness-owned output.
3. **Actor:** The Maintainer confirms synchronization when changes are requested. **System:** The system publishes only Harness-owned adapter changes that route to canonical repository sources.
4. **Actor:** The Contributor invokes a Harness workflow from a supported runtime. **System:** The runtime resolves the canonical workflow through direct discovery or its thin adapter without changing workflow meaning.
5. **Actor:** The Contributor follows the workflow. **System:** The same repository authority, approval boundaries, and canonical templates apply regardless of runtime.

### Alternative flows

- **A1 — Check without synchronization.** Source step: 1. Condition: the Maintainer requests adapter verification only. Behavior: the system reports direct-discovery health, missing or stale adapters, ownership conflicts, and broken canonical targets without writing. Resume at step: 2.
- **A2 — Use direct discovery.** Source step: 2. Condition: the selected runtime supports the canonical repository skill location. Behavior: the system reports the direct canonical entrypoint and creates no redundant adapter. Resume at step: 4.
- **A3 — Preview synchronization.** Source step: 3. Condition: the Maintainer requests a preview. Behavior: the system lists every Harness-owned file that would be created, updated, or removed and makes no change. Resume at step: 2.
- **A4 — Diagnose runtime access.** Source step: 1. Condition: the Maintainer requests consolidated health diagnostics. Behavior: the system reports canonical entrypoint, fingerprint, adapter, ownership, and runtime-location findings as part of overall Harness health. Ends with: runtime findings available to the integrity capability.

### Exception flows

- **E1 — Canonical source unavailable.** Source step: 1. Failure: a required canonical skill, workflow, or template target cannot be resolved. Handling: report the broken target and block adapter success. Prohibited: embedding a substitute workflow body in the adapter. Failure postcondition: no new adapter is presented as valid.
- **E2 — Unowned configuration conflict.** Source step: 2. Failure: synchronization would replace or remove content not marked as Harness-owned. Handling: identify the conflict and refuse that write. Prohibited: overwriting, deleting, or silently merging unowned content. Failure postcondition: user-owned configuration remains unchanged.
- **E3 — Adapter drift.** Source step: A1. Failure: an existing Harness-owned adapter does not match its canonical source or declared ownership evidence. Handling: report the stale adapter and proposed remediation. Prohibited: treating drifted routing as current. Failure postcondition: the read-only check fails without modifying the adapter.
- **E4 — Unsupported runtime.** Source step: 1. Failure: the requested runtime has no approved repository-local access contract. Handling: report it as unsupported. Prohibited: guessing or writing an ungoverned adapter format. Failure postcondition: repository configuration remains unchanged.

### Postconditions

- **Synchronization success:** Every supported runtime has a valid direct or thin-adapter route to the canonical Harness workflow sources.
- **Check success:** Runtime access is current, canonical targets resolve, and no ownership conflict exists.
- **Preview success:** The exact proposed Harness-owned changes are visible and no file changes.
- **Failure:** User-owned configuration is unchanged and diagnostics identify the broken source, adapter, ownership, or runtime contract.

## Requirements

- **FR-001 — Canonical access [Observed]:** The system shall provide each supported runtime one repository-local route to the canonical Harness skills and workflows.
- **FR-002 — Thin adapters [Observed]:** Where direct discovery is unavailable, the system shall synchronize thin adapters that identify and route to canonical sources without duplicating their bodies.
- **FR-003 — Ownership safety [Observed]:** Synchronization shall write or remove only clearly Harness-owned adapter content and shall preserve unowned runtime configuration.
- **FR-004 — Preview [Inferred]:** The system shall let a Maintainer inspect every proposed adapter creation, update, and removal without mutation.
- **FR-005 — Drift detection [Observed]:** Read-only checks shall identify missing, stale, modified, broken, or obsolete runtime access paths.
- **FR-006 — Runtime diagnostics [Observed]:** Consolidated health diagnostics shall include stable runtime-access and adapter findings.
- **BR-001 [Observed]:** Canonical workflow authority remains under `docs/harness/` and canonical `.agents/skills/harness-*` entrypoints; adapters shall not become a parallel source of truth.
- **BR-002 [Observed]:** Runtime access shall not launch agents, change user-global configuration, or grant human approval.
- **BR-003 [Inferred]:** All supported runtimes shall expose equivalent Harness workflow meaning and approval boundaries.
- **NFR-001 — Determinism [Observed]:** Equivalent canonical sources shall produce byte-stable Harness-owned adapter output and fingerprints.
- **NFR-002 — Portability [Observed]:** Runtime routes shall resolve from the repository root across supported path conventions and nested working directories.
- **NFR-003 — Diagnosability [Inferred]:** A failed runtime-access check shall identify the runtime, affected route, ownership state, and expected canonical target.

## Acceptance

- [ ] Every supported runtime resolves the same canonical Harness workflow meaning and approval boundaries.
- [ ] Direct-discovery runtimes require no redundant generated adapter.
- [ ] Thin adapters contain routing and ownership evidence without copied canonical workflow bodies.
- [ ] Preview lists exact proposed Harness-owned changes and changes no file.
- [ ] Checks detect missing, stale, modified, broken, and obsolete adapters.
- [ ] Synchronization never overwrites or removes unowned runtime configuration.
- [ ] Broken canonical sources cause adapter checks to fail with the affected target identified.
- [ ] Runtime-access diagnostics appear in consolidated Harness health results.

**Scenario: synchronize a thin adapter**
Given a supported runtime cannot directly discover the canonical Harness skill
And its target adapter path is available for Harness ownership
When the Repository Maintainer synchronizes runtime access
Then a thin adapter routes to the canonical repository source
And no workflow body is duplicated.

**Scenario: preserve custom runtime configuration**
Given a target runtime path contains unowned user configuration
When adapter synchronization would replace that content
Then the write is rejected with an ownership conflict
And the existing configuration remains unchanged.

**Scenario: detect adapter drift without mutation**
Given a Harness-owned adapter no longer matches its canonical source
When the Repository Maintainer checks runtime access
Then the stale adapter and expected canonical target are reported
And no repository file changes.

## Relationships

- Spec: [[workflow-lifecycle]]
- Decision: [[DEC-001-cli-command-parsing|DEC-001]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]], [[FEAT-003-verify-harness-integrity|FEAT-003]]
- Plan: [[260714-0033-file-based-agent-harness/plan|Plan]]
- Source: `docs/harness/RULES.md`
- Source: `docs/harness/SKILL-PORTS.md`
- Source: `docs/harness/plans/260714-0033-file-based-agent-harness/phase-06-runtime-adapters-and-doctor.md`
