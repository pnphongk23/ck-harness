---
schema_version: 1
type: feature
id: FEAT-006
title: Configure Harness document folders
status: proposed
created: 2026-07-14
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans: []
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/SKILL-PORTS.md
    - src/fs/repository.ts
    - src/core/lifecycle.ts
    - src/core/integrity.ts
    - src/index/index.ts
    - src/watcher/index.ts
    - src/adapters/index.ts
---

# FEAT-006: Configure Harness document folders

## Introduction

**Purpose:** Let a Repository Maintainer place Harness documents in repository-appropriate folders while preserving one predictable default layout and every canonical artifact filename rule.

**In scope:**

- Configure one repository-contained Harness document root.
- Configure a distinct folder under that root for each logical document collection: Features, Specs, Decisions, Plans, Reports, Rules, templates, and workflows.
- Use `docs/harness/` and its current canonical subfolders when no folder configuration exists.
- Apply the resolved folders consistently to initialization, artifact lifecycle operations, workflow discovery, validation, health checks, indexing, watching, graph generation, cleanup, and supported AI-platform access.
- Report the resolved repository-relative paths and actionable folder-configuration errors.

**Out of scope:**

- Customizing artifact IDs, filename patterns, slug rules, plan directory names, Work Item filenames, or index filenames.
- Placing a configured document collection outside the Harness document root or repository.
- Automatically moving existing documents, renaming artifacts, or rewriting relationships when folder configuration changes.
- Configuring runtime adapter locations owned by [[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]].
- Choosing the configuration file format, parser, or source layout.

### Evidence classification

- **Observed:** Product Authority requires folder-only customization, the zero-configuration default `docs/harness/`, and unchanged filename rules.
- **Observed:** Current repository policy and behavior use `docs/harness/` as the canonical root and define fixed paths for every document collection.
- **Observed:** The Harness graph connects folder-sensitive lifecycle, workflow, integrity, navigation, and runtime-access behavior across FEAT-001 through FEAT-005.
- **Inferred:** A logical collection must retain a stable meaning independently of its configured folder name so every Harness operation resolves the same documents.
- **Inferred:** Explicit invalid configuration must fail visibly rather than silently falling back to `docs/harness/`, because fallback could read or mutate the wrong document set.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Maintainer | Business role | Fit Harness documents into the repository's documentation layout | Choose valid folders and relocate existing documents explicitly when needed |
| Repository Contributor | Business role | Use Harness without learning repository-specific physical paths | Invoke workflows and commands through their logical artifact kinds |
| CI system | External system | Verify the configured Harness deterministically | Run integrity and index checks from the repository configuration |
| Supported AI platform | External system | Reach the same canonical Harness workflows after folders change | Resolve repository-local Harness access through the approved runtime contract |

### User needs

- A Maintainer needs to use `docs/harness/` unchanged in repositories that prefer the standard layout.
- A Maintainer needs to select a root such as `docs/` and give each document collection its own folder without weakening artifact identity or naming rules.
- A Contributor needs lifecycle and workflow operations to behave the same regardless of physical folder names.
- CI and supported AI platforms need one unambiguous configured document set rather than hard-coded `docs/harness/` assumptions.

### Preconditions

- The requested root and collection folders are repository-relative, contained in the repository, and unambiguous.
- Each logical document collection maps to one distinct folder under the configured root.
- Existing artifacts retain filenames that conform to the canonical rules for their kinds.

### Trigger

A Repository Maintainer initializes Harness with a folder configuration or a Harness actor invokes an operation in a repository that has one.

### Main flow

1. **Actor:** The Maintainer defines the desired Harness document root and any collection-folder overrides. **System:** The system validates that the resulting layout is contained, distinct, and unambiguous.
2. **Actor:** A Contributor, CI system, or supported AI platform starts a Harness operation. **System:** The system discovers the repository's effective folder layout before locating Harness documents.
3. **Actor:** The actor requests work by logical document kind. **System:** The system reads, validates, creates, watches, indexes, graphs, or cleans only the paths assigned to that kind while enforcing the existing filename rules.
4. **Actor:** The actor reviews the outcome. **System:** The system reports repository-relative resolved paths and preserves unrelated files and folders.

### Alternative flows

- **A1 — Use the default layout.** Source step: 1. Condition: no folder configuration exists. Behavior: the system resolves the root to `docs/harness/` and uses the current canonical collection folders. Resume at step: 2.
- **A2 — Override only the root.** Source step: 1. Condition: the Maintainer selects a root such as `docs/` without collection overrides. Behavior: the system uses the canonical collection folder names under that root. Resume at step: 2.
- **A3 — Override collection folders.** Source step: 1. Condition: the Maintainer supplies one or more collection-folder overrides. Behavior: the system merges those overrides with canonical defaults and identifies every collection by its logical kind rather than its display name. Resume at step: 2.
- **A4 — Initialize a configured layout.** Source step: 2. Condition: the requested operation is Harness initialization. Behavior: the system creates only missing allowlisted paths in the effective layout and preserves existing content. Resume at step: 4.

### Exception flows

- **E1 — Invalid or escaping folder.** Source step: 1. Failure: a configured path is absolute, escapes the repository or root, or resolves through an unsafe boundary. Handling: reject the layout and identify the field and path. Prohibited: falling back to the default layout or touching either location. Failure postcondition: repository content is unchanged.
- **E2 — Ambiguous collection mapping.** Source step: 1. Failure: two logical collections map to the same or overlapping folder. Handling: reject the layout and identify every conflicting collection. Prohibited: guessing document kinds from file content. Failure postcondition: no Harness operation starts.
- **E3 — Configured documents are missing.** Source step: 2. Failure: a non-initialization operation cannot find required documents in the effective layout. Handling: report the expected configured paths and required corrective action. Prohibited: searching unrelated folders or silently reading the old default location. Failure postcondition: no mutation is reported as successful.
- **E4 — Filename rule mismatch.** Source step: 3. Failure: a document in a configured folder violates its canonical filename or ID agreement. Handling: report the same validation failure that would apply under `docs/harness/`. Prohibited: accepting a different naming policy because the folder is customized. Failure postcondition: invalid authored content remains unmodified.

### Postconditions

- **Success:** Every Harness capability resolves one consistent repository-contained document layout, reports its effective paths, and preserves canonical filenames.
- **Failure:** No alternate layout is guessed, no unrelated path is mutated, and the actor receives the invalid or missing configured path.

## Requirements

- **FR-001 — Configurable document root [Observed]:** The system shall let a Repository Maintainer configure one repository-contained Harness document root.
- **FR-002 — Configurable collection folders [Observed]:** The system shall let the Maintainer configure distinct folders for Features, Specs, Decisions, Plans, Reports, Rules, templates, and workflows under the document root.
- **FR-003 — Default compatibility [Observed]:** When no folder configuration exists, the effective layout shall remain `docs/harness/` with the current canonical collection folders.
- **FR-004 — Consistent resolution [Inferred]:** Initialization, lifecycle, workflow, integrity, index, watch, graph, cleanup, and runtime-access behavior shall use the same effective folder layout.
- **FR-005 — Effective-path evidence [Inferred]:** Results and failures shall identify affected paths relative to the repository using the effective layout.
- **FR-006 — Explicit invalid configuration [Inferred]:** Invalid, escaping, duplicate, overlapping, or missing configured paths shall produce actionable failures without silent default fallback.
- **BR-001 — Folder-only customization [Observed]:** Folder configuration shall not change `FEAT-XXX-kebab-name.md`, semantic Spec names, `DEC-XXX-kebab-name.md`, `YYMMDD-HHmm-slug/` Plan directories, `work-item-XX-name.md`, `REP-XXX-kebab-name.md`, or `RULE-XXX-kebab-name.md` rules.
- **BR-002 — Stable identity [Observed]:** IDs, monotonic allocation, filename/frontmatter agreement, wikilink semantics, and slug-rename behavior shall remain unchanged in every configured layout.
- **BR-003 — One contained layout [Inferred]:** Every configured collection folder shall be distinct and contained under one repository-contained document root.
- **BR-004 — No implicit migration [Inferred]:** Changing folder configuration shall not move documents, rename files, rewrite relationships, or merge old and new layouts implicitly.
- **BR-005 — Derived views only [Observed]:** Index and graph outputs shall remain derived and replaceable; folder configuration shall not make them canonical authored state.
- **NFR-001 — Backward compatibility [Observed]:** Existing zero-configuration `docs/harness/` repositories shall retain the same observable paths and behavior.
- **NFR-002 — Determinism [Inferred]:** Equivalent documents and equivalent effective folder configuration shall produce byte-stable validation and derived navigation outcomes.
- **NFR-003 — Portability [Inferred]:** Folder discovery, containment, and reported repository-relative paths shall behave consistently on supported macOS, Linux, and Windows environments.
- **NFR-004 — Safety [Observed]:** Folder resolution shall preserve unrelated user changes and shall never widen mutation scope beyond the effective Harness layout.

## Acceptance

- [ ] With no folder configuration, Harness initializes and operates at `docs/harness/` with unchanged collection folders and filenames.
- [ ] With root `docs/` and no collection overrides, a new Feature is placed at `docs/features/FEAT-XXX-kebab-name.md` and retains the canonical ID and filename checks.
- [ ] With a configured Feature folder such as `product-features/`, Feature operations resolve that folder by logical kind without changing Feature filename rules.
- [ ] Configured Specs, Decisions, Plans, Reports, Rules, templates, and workflows are resolved consistently by their owning capabilities.
- [ ] An attempt to configure a different filename pattern or use a nonconforming filename is rejected.
- [ ] Absolute, escaping, duplicate, and overlapping folder mappings fail before any Harness mutation.
- [ ] Changing an existing repository's folder configuration does not move or rename documents implicitly and reports documents missing from the effective layout.
- [ ] Validation, index checks, watch reconciliation, graph generation, cleanup, and runtime-access checks contain their work to the effective layout.
- [ ] The Harness relationship graph resolves FEAT-006 links to FEAT-001 through FEAT-005 and exposes corresponding backlinks without unresolved relationships.

**Scenario: preserve the default layout**
Given a repository has no Harness folder configuration
When the Maintainer initializes or uses Harness
Then the document root is `docs/harness/`
And every existing canonical collection folder and filename rule remains unchanged.

**Scenario: use repository-specific folders**
Given the Maintainer configures `docs/` as the root and `product-features/` as the Feature folder
When a Contributor creates a Feature
Then the Feature is created under `docs/product-features/`
And its filename still matches `FEAT-XXX-kebab-name.md`
And its frontmatter ID matches the filename ID.

**Scenario: reject naming customization**
Given a repository uses a valid custom document folder
When its configuration or authored content attempts to replace the canonical filename rule
Then Harness rejects the request with the affected kind and path
And no alternate naming rule becomes active.

**Scenario: reject an ambiguous layout**
Given Features and Decisions are configured to the same or overlapping folder
When a Harness operation resolves the effective layout
Then the operation fails and identifies both conflicting collections
And neither the configured layout nor `docs/harness/` is mutated.

## Relationships

- Spec: [[workflow-lifecycle]]
- Related Feature: [[FEAT-001-harness-cli|FEAT-001]] — initialization, lifecycle operations, allocation, cleanup, and reported paths use the effective layout.
- Related Feature: [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]] — workflow artifacts and approval relationships remain traceable after physical folders change.
- Related Feature: [[FEAT-003-verify-harness-integrity|FEAT-003]] — validation, index correctness, and health diagnostics validate the effective layout while preserving filename rules.
- Related Feature: [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]] — index, backlinks, watch scope, graph input, and disposable graph output follow the effective layout.
- Related Feature: [[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]] — supported AI platforms and adapters resolve canonical workflows after document folders change; runtime adapter locations remain outside this Feature.
- Source: `docs/harness/RULES.md`
- Source: `docs/harness/SKILL-PORTS.md`
- Source: `src/fs/repository.ts`
- Source: `src/core/lifecycle.ts`
- Source: `src/core/integrity.ts`
- Source: `src/index/index.ts`
- Source: `src/watcher/index.ts`
- Source: `src/adapters/index.ts`
