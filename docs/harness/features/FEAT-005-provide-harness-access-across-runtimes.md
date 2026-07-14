---
schema_version: 1
type: feature
id: FEAT-005
title: Use Harness across AI platforms
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
---

# FEAT-005: Use Harness across AI platforms

## Introduction

**Purpose:** Let contributors use the same Harness workflows from supported AI platforms such as Codex, Claude, Cursor, and Antigravity.

**In scope:**

- Let each supported AI platform find the repository's Harness skills.
- Create small adapter files for platforms that cannot read the Harness skills directly.
- Preview adapter changes before writing them.
- Find missing, outdated, changed, or broken adapters.
- Report platform access problems through Harness health checks.
- Remove old adapters only when they were created and owned by Harness.

**Out of scope:**

- Starting or controlling an AI platform.
- Copying full Harness workflows into platform-specific files.
- Changing a user's global configuration.
- Overwriting repository files that Harness does not own.

### Evidence classification

- **Observed:** Harness workflows and skills in this repository are the shared source for all supported platforms.
- **Observed:** Repository rules require Harness to preserve user-owned files and never launch AI agents.
- **Inferred:** Some platforms can read the shared skills directly, while others may need a small adapter file that points to them.
- **TBD:** The supported platforms and the exact adapter format for each platform still need technical confirmation.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Use Harness from a preferred AI platform | Choose and follow a Harness workflow |
| Repository Maintainer | Business role | Keep platform access working without losing custom files | Review, apply, and check adapter changes |
| Supported AI platform | External system | Find the repository's Harness skills | Open the shared skill directly or through an adapter |

### User needs

- A Contributor needs the same Harness workflow regardless of which supported AI platform is used.
- A Maintainer needs to see proposed adapter changes before any file is written.
- A Maintainer needs clear errors when an adapter is missing, outdated, changed, or points to a missing skill.
- A Maintainer needs confidence that Harness will not overwrite custom platform files.

### Preconditions

- The repository contains the Harness skills and workflows.
- The selected AI platform is supported by the repository.
- Harness may write only to repository files that are reserved for Harness adapters.

### Trigger

A Maintainer previews, applies, or checks AI platform access, or a Contributor opens a Harness skill from a supported platform.

### Main flow

1. **Actor:** The Maintainer asks Harness to check AI platform access. **System:** The system checks how each supported platform reaches the shared Harness skills and reports any missing, outdated, or broken adapter.
2. **Actor:** The Maintainer asks to preview repairs. **System:** The system lists every adapter file it would create, update, or remove without changing the repository.
3. **Actor:** The Maintainer approves the proposed file changes by requesting synchronization. **System:** The system creates, updates, or removes only Harness-owned adapter files.
4. **Actor:** The Contributor opens a Harness skill from a supported AI platform. **System:** The platform reaches the shared Harness skill directly or through its adapter.
5. **Actor:** The Contributor follows the skill. **System:** The same Harness workflow and approval rules apply on every supported platform.

### Alternative flows

- **A1 — Direct access.** Source step: 1. Condition: the platform can already read the shared Harness skills. Behavior: the system reports direct access and creates no adapter. Resume at step: 4.
- **A2 — Preview only.** Source step: 2. Condition: the Maintainer does not request synchronization after reviewing the preview. Behavior: the system makes no file changes. Ends with: unchanged repository.
- **A3 — Check only.** Source step: 1. Condition: the Maintainer does not request a repair preview. Behavior: the system reports problems and suggested actions without changing any file. Ends with: platform access report.
- **A4 — Health check.** Source step: 1. Condition: the Maintainer runs the general Harness health check. Behavior: the system includes platform access problems in the health result. Ends with: combined health report.

### Exception flows

- **E1 — Shared skill is missing.** Source step: 1. Failure: an adapter points to a Harness skill that does not exist. Handling: name the missing skill and fail the check. Prohibited: copying or inventing a replacement workflow. Failure postcondition: no adapter is reported as working.
- **E2 — File belongs to the user.** Source step: 3. Failure: a proposed adapter would replace or remove a file that Harness does not own. Handling: identify the file and refuse that change. Prohibited: overwriting, deleting, or merging the user's file. Failure postcondition: the user's file is unchanged.
- **E3 — Adapter is outdated or changed.** Source step: A3. Failure: an adapter no longer matches the shared Harness skill or the expected adapter content. Handling: identify the adapter and explain that synchronization can repair it. Prohibited: reporting the adapter as current. Failure postcondition: the check changes no files.
- **E4 — Platform is unsupported.** Source step: 1. Failure: no approved access method exists for the selected platform. Handling: report that the platform is unsupported. Prohibited: guessing where or how to create an adapter. Failure postcondition: the repository is unchanged.

### Postconditions

- **Synchronization success:** Every supported AI platform can reach the shared Harness skills.
- **Check success:** Required adapters exist, point to real skills, and have the expected content.
- **Preview success:** The Maintainer sees the exact proposed changes and no file is changed.
- **Failure:** User-owned files remain unchanged and the result names the platform and file that need attention.

## Requirements

- **FR-001 — Platform access [Observed]:** Each supported AI platform shall have one repository-local way to reach the shared Harness skills.
- **FR-002 — Small adapters [Inferred]:** A platform that cannot read the shared skills directly shall use small adapter files that point to those skills without copying full workflows.
- **FR-003 — Safe changes [Observed]:** Synchronization shall change or remove only adapter files owned by Harness.
- **FR-004 — Preview [Inferred]:** A Maintainer shall be able to see every proposed adapter change without changing the repository.
- **FR-005 — Clear checks [Inferred]:** Read-only checks shall report missing, outdated, changed, broken, and unneeded adapters.
- **FR-006 — Health report [Inferred]:** General Harness health checks shall include AI platform access problems.
- **BR-001 [Observed]:** Shared Harness skills and workflows remain the source used by every platform.
- **BR-002 [Observed]:** Platform access shall not start an agent, change global configuration, or approve work for a human.
- **NFR-001 — Repeatable output [Observed]:** The same Harness skills and platform settings shall produce the same adapter files and check results.
- **NFR-002 — Clear errors [Inferred]:** A failed check shall name the platform, affected file, problem, and suggested next action.

## Acceptance

- [ ] Every supported AI platform can reach the same shared Harness skills.
- [ ] Platforms with direct access do not receive unnecessary adapters.
- [ ] Adapter files point to shared skills and do not copy full workflows.
- [ ] Preview lists exact changes without writing files.
- [ ] Checks report missing, outdated, changed, broken, and unneeded adapters.
- [ ] Synchronization does not overwrite or remove user-owned files.
- [ ] A missing shared skill causes the check to fail and names the missing skill.
- [ ] General Harness health results include AI platform access problems.

**Scenario: create an adapter**
Given a supported AI platform cannot read the shared Harness skill directly
And its adapter path is available for Harness to use
When the Maintainer synchronizes platform access
Then Harness creates a small adapter that points to the shared skill
And the adapter does not contain a copy of the workflow.

**Scenario: preserve a custom file**
Given the adapter path contains a file that Harness does not own
When synchronization would replace that file
Then Harness refuses the change and identifies the conflict
And the existing file remains unchanged.

**Scenario: find an outdated adapter**
Given a Harness-owned adapter no longer matches the shared skill
When the Maintainer checks platform access
Then Harness reports the outdated adapter and the skill it should use
And no repository file is changed.

## Relationships

- Spec: [[workflow-lifecycle]]
- Decision: [[DEC-001-cli-command-parsing|DEC-001]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]], [[FEAT-003-verify-harness-integrity|FEAT-003]]
- Plan: [[260714-0033-file-based-agent-harness/plan|Plan]]
- Source: `docs/harness/RULES.md`
- Source: `docs/harness/SKILL-PORTS.md`
