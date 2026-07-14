---
schema_version: 1
type: feature
id: FEAT-003
title: Verify Harness integrity
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Product Authority
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
  plans:
    - "[[260714-1128-verify-harness-integrity/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/plans/260714-1128-verify-harness-integrity/phase-02-scoped-validation.md
    - docs/harness/plans/260714-1128-verify-harness-integrity/phase-03-index-correctness.md
    - docs/harness/plans/260714-1128-verify-harness-integrity/phase-04-health-diagnostics.md
---

# FEAT-003: Verify Harness integrity

## Introduction

**Purpose:** Let contributors, maintainers, and CI determine whether Harness documents, relationships, derived state, and local Harness prerequisites are valid enough for the next workflow action.

**In scope:**

- Validate one Harness document, one supported artifact scope, or the complete Harness.
- Check filename, frontmatter, content, relationship, wikilink, approval, lifecycle, and cross-document invariants.
- Compare the persisted derived index with the expected logical index without changing canonical documents.
- Run consolidated health diagnostics for repository discovery, supported versions, canonical workflow sources, and optional dependencies.
- Return actionable diagnostics and stable success or failure outcomes for people and CI.

**Out of scope:**

- Repairing invalid authored content automatically.
- Building or continuously reconciling the persisted index.
- Synchronizing runtime adapters.
- Treating an optional visualization dependency as required Harness validity.

### Evidence classification

- **Observed:** The approved split assigns validation, `index check`, and general `doctor` outcomes to one integrity capability.
- **Observed:** Repository Rules require validation before completion and reject broken relationships, stale approvals, and invalid transitions.
- **Inferred:** Contributors and CI share the same business outcome even when they request different diagnostic scopes: a trustworthy eligibility result with actionable evidence.
- **TBD:** The exact set and severity of diagnostic check identifiers remains subject to downstream planning without changing observable success and failure policy.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Find and correct Harness issues before handoff | Request an appropriate validation scope and act on diagnostics |
| Repository Maintainer | Business role | Assess repository-wide readiness and operating health | Interpret policy and environment findings |
| CI System | External system | Prevent invalid or stale Harness state from being promoted | Run deterministic integrity gates and honor their outcome |

### User needs

- A Contributor needs diagnostics tied to the exact document and violated contract.
- A Maintainer needs one health view that distinguishes errors from optional warnings.
- A CI System needs deterministic, non-mutating outcomes that reliably gate promotion.

### Preconditions

- The repository and requested Harness scope are readable.
- Commands other than initialization operate against a Harness schema recognized by the verifier.
- A path-scoped request identifies an existing unambiguous supported document.

### Trigger

A Repository Contributor, Repository Maintainer, or CI System requests validation, an index correctness check, or consolidated Harness health diagnostics.

### Main flow

1. **Actor:** The actor requests an integrity check and its scope. **System:** The system identifies the repository, supported schema, and applicable contracts without changing Harness state.
2. **Actor:** The actor waits for evaluation. **System:** The system reads the requested evidence and checks every applicable document, relationship, lifecycle, derived-state, and local prerequisite rule.
3. **Actor:** The actor receives the result. **System:** The system groups findings by source and severity, identifies the governing contract, and returns a stable outcome.
4. **Actor:** The actor decides the next workflow action. **System:** The system exposes enough evidence to correct an error, accept an optional warning, or proceed when the check succeeds.

### Alternative flows

- **A1 — Validate a limited scope.** Source step: 1. Condition: the Contributor selects one path or supported artifact scope. Behavior: the system evaluates that scope plus the cross-document evidence necessary to determine its integrity. Resume at step: 3.
- **A2 — Run the CI correctness gate.** Source step: 1. Condition: the CI System requests complete validation and derived-index checking. Behavior: the system constructs the expected logical state in memory and compares it with the persisted state. Resume at step: 3.
- **A3 — Diagnose Harness health.** Source step: 1. Condition: the Maintainer requests consolidated diagnostics. Behavior: the system evaluates repository, version, schema, index, canonical workflow, and optional dependency health and labels each finding by severity. Resume at step: 3.
- **A4 — Report an optional dependency warning.** Source step: 2. Condition: an optional local capability is unavailable while canonical Harness behavior remains valid. Behavior: the system reports a warning and preserves the successful integrity outcome for unrelated checks. Resume at step: 3.

### Exception flows

- **E1 — Unsupported verification context.** Source step: 1. Failure: the repository, requested scope, or schema cannot be identified safely. Handling: report the failed precondition and a non-success outcome. Prohibited: guessing the target or claiming partial verification as complete. Failure postcondition: no repository file is changed.
- **E2 — Invalid canonical document.** Source step: 2. Failure: an authored document violates its schema, content, identity, relationship, approval, or lifecycle contract. Handling: identify every detected source and violated rule. Prohibited: silently repairing authored content. Failure postcondition: the integrity gate fails and authored content remains unchanged.
- **E3 — Stale or inconsistent derived index.** Source step: A2. Failure: persisted logical index content differs from the expected in-memory result. Handling: identify the inconsistent sources and fail the correctness gate. Prohibited: relying on a running watcher or updating the index during a check. Failure postcondition: CI cannot treat the state as current.
- **E4 — Required local prerequisite unavailable.** Source step: A3. Failure: a required supported version or canonical source is missing or incompatible. Handling: report the prerequisite and remediation evidence as an error. Prohibited: downgrading a required failure to an optional warning. Failure postcondition: health verification does not succeed.

### Postconditions

- **Validation success:** Every applicable contract in the requested scope passes.
- **Correctness-gate success:** Canonical documents are valid and persisted derived logical state matches the expected result.
- **Health success:** Required local prerequisites pass and optional limitations are clearly labeled.
- **Failure:** No repository state changes, the outcome is non-success, and diagnostics identify the source and next corrective action.

## Requirements

- **FR-001 — Scoped validation [Observed]:** The system shall validate one document, one supported artifact scope, or the complete Harness as explicitly requested.
- **FR-002 — Contract coverage [Observed]:** Validation shall check applicable frontmatter, filename, content, identity, relationship, wikilink, approval, lifecycle, and cross-document invariants.
- **FR-003 — Derived correctness [Observed]:** An index check shall construct expected logical state in memory and fail when persisted state is stale, invalid, or inconsistent.
- **FR-004 — Consolidated health [Observed]:** Health diagnostics shall evaluate required repository, version, schema, index, and workflow-source prerequisites.
- **FR-005 — Actionable evidence [Inferred]:** Every finding shall identify its source, severity, governing contract, and a next corrective action when one is available.
- **FR-006 — Machine gate [Observed]:** Every integrity operation shall return a stable outcome suitable for CI as well as concise human-readable evidence.
- **BR-001 [Observed]:** Integrity operations are read-only and shall not repair canonical documents, rebuild the persisted index, or synchronize adapters.
- **BR-002 [Observed]:** Optional capabilities may warn but shall not invalidate unrelated canonical Harness behavior.
- **BR-003 [Observed]:** Watcher activity shall not substitute for an explicit correctness gate.
- **NFR-001 — Determinism [Observed]:** Equivalent logical input and environment evidence shall produce the same ordered findings and outcome.
- **NFR-002 — Completeness [Observed]:** A full-scope check shall report all detected independent findings rather than stopping after the first error.
- **NFR-003 — Portability [Observed]:** Diagnostics shall use stable identifiers and repository-relative paths across supported environments.

## Acceptance

- [ ] One document, one supported artifact scope, and the complete Harness can be validated independently.
- [ ] Malformed content, duplicate or mismatched IDs, broken links, invalid approvals, and invalid lifecycle transitions produce source-specific errors.
- [ ] Read-only integrity checks change no repository file.
- [ ] A stale logical index causes the correctness gate to fail without rebuilding it.
- [ ] Consolidated health distinguishes required errors from optional warnings.
- [ ] Missing optional Graphify support does not invalidate otherwise valid canonical Harness state.
- [ ] Equivalent evidence produces deterministic ordered diagnostics and a stable outcome for CI.

**Scenario: validate one Feature**
Given a Feature exists in a readable initialized Harness
When the Repository Contributor validates that Feature
Then every applicable local and relationship contract is checked
And the result identifies each detected violation without modifying the Feature.

**Scenario: reject a stale index in CI**
Given canonical Harness documents differ from the persisted logical index
When the CI System runs the correctness gate
Then the result identifies the inconsistent sources
And returns a failing outcome
And does not rebuild the index.

**Scenario: preserve validity with an optional warning**
Given canonical Harness state is valid and an optional graph utility is unavailable
When the Repository Maintainer runs health diagnostics
Then the missing utility is reported as a warning
And unrelated required checks can still succeed.

## Relationships

- Spec: [[workflow-lifecycle]]
- Decision: [[DEC-001-cli-command-parsing|DEC-001]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]], [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]], [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]
- Plan: [[260714-1128-verify-harness-integrity/plan|Plan]]
- Source: `docs/harness/RULES.md`
- Source: `docs/harness/plans/260714-1128-verify-harness-integrity/phase-02-scoped-validation.md`
- Source: `docs/harness/plans/260714-1128-verify-harness-integrity/phase-03-index-correctness.md`
- Source: `docs/harness/plans/260714-1128-verify-harness-integrity/phase-04-health-diagnostics.md`
