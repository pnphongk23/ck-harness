---
schema_version: 1
type: feature
id: FEAT-008
title: Automate Harness workflow operations
status: approved
created: 2026-07-16
approved: 2026-07-16
approved_by: Product Authority
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  plans:
    - "[[260716-2335-automate-harness-workflow-operations/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
  source_paths:
    - src/cli/index.ts
    - src/core/lifecycle.ts
    - src/core/integrity.ts
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - docs/harness/workflows/cook.md
    - .agents/skills/harness-feature/SKILL.md
    - .agents/skills/harness-plan/SKILL.md
    - .agents/skills/harness-cook/SKILL.md
---

# FEAT-008: Automate Harness workflow operations

## Introduction

**Purpose:** Reduce agent error and repeated document parsing by making the
Harness CLI the deterministic path for routine workflow scaffolding, review
recording, preflight checks, state inspection, and valid lifecycle transitions.

**In scope:**

- Create canonical Feature and Plan starters through the CLI.
- Inspect the current workflow state, blockers, governing authority, and next
  eligible action without mutating repository state.
- Record a human Feature review outcome and a human Plan review outcome through
  validated CLI commands.
- Change Plan and Work Item execution status through validated CLI commands.
- Make workflows and installed Harness skills invoke the CLI for every
  supported operation, consume its result, and avoid duplicating the same
  validation through manual document reasoning.
- Preserve configured Harness directories, stable JSON output, deterministic
  files, atomic mutation, and existing authority boundaries.

**Out of scope:**

- Letting an agent grant approval, choose an authority outcome, or infer that
  silence means approval.
- Automatically starting implementation, changing Git state, committing,
  pushing, releasing, or deploying after a transition.
- Replacing business or technical content authoring with generated prose.
- A generic unrestricted command that can force any artifact into any status.
- Lifecycle expansion for Specs, Reports, Rules, or Decisions beyond checks
  needed to determine Feature, Plan, and Work Item eligibility.

### Evidence classification

- **Observed:** `ckh feature create/list/show` and integrity commands exist, but
  `src/cli/index.ts` exposes no Feature approval, Plan creation/review, workflow
  state, or execution transition commands.
- **Observed:** `docs/harness/workflows/feature.md`, `plan.md`, and `cook.md`
  describe gates and state changes without naming a required CLI command for
  most of those operations.
- **Observed:** `DEC-005` separates review approval from execution status, so
  automation must preserve two independent state dimensions for Plans.
- **Observed:** `DEC-002` requires complete staged validation and safe file
  publication for lifecycle mutation.
- **Inferred:** Centralizing mechanical checks and mutations in the CLI will
  reduce repeated token use and lower the probability of invalid hand-edited
  frontmatter, while workflow/skill instructions remain necessary to make
  agents consistently use the capability.
- **Failed:** No `RTK.md` referenced by the repository instruction include was
  found in the repository or its parent directory during discovery.
- **Observed and clarified by Product Authority:** A negative review keeps a
  Feature non-approved for revision and sets Plan approval to
  `changes_requested`; it does not introduce a terminal rejected state.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Product Authority | Business role | Review Feature behavior without editing lifecycle metadata by hand | Choose the Feature review outcome and identify themselves |
| Repository Maintainer | Business role | Review Plans and control execution authority safely | Choose Plan review outcomes and authorize execution transitions |
| Repository Contributor | Business role | Create and inspect workflow artifacts with less repetitive work | Supply titles, content, relationships, and requested transitions |
| AI agent runtime | External system | Follow Harness workflows consistently with fewer invalid mutations | Invoke required CLI commands and report their exact outcomes |

### User needs

- A Product Authority needs approval or negative review to record exactly the
  human decision supplied, with provenance, without allowing an agent to decide.
- A Repository Maintainer needs Plan review state to remain separate from Plan
  and Work Item execution state.
- A Repository Contributor needs canonical starters and actionable preflight
  diagnostics instead of reconstructing schema details from multiple files.
- An AI agent runtime needs one concise state result containing blockers and the
  next allowed operation before it authors a Plan or starts a Work Item.

### Preconditions

- The Harness workspace is initialized and its configured document paths can be
  resolved.
- The requested target resolves unambiguously and the current repository state
  is valid enough to evaluate the requested operation.
- A review-recording command receives the explicit outcome, date, and authority
  supplied by the responsible human.
- An execution transition satisfies governing Feature approval, Plan approval,
  dependency, Decision, evidence, and aggregation preconditions defined by
  `workflow-lifecycle`.

### Trigger

A contributor or agent reaches a documented workflow boundary that has a
supported CLI operation: create, inspect, preflight, record review, or change
execution state.

### Main flow

1. **Actor:** The actor invokes the workflow-state check for the intended
   Feature, Plan, or Work Item. **System:** The system returns current review and
   execution state, governing relationships, blockers, and the next eligible
   operations without changing files.
2. **Actor:** The actor requests a supported creation operation when an artifact
   is needed. **System:** The system allocates the safe identity or directory,
   renders the canonical starter, validates it, and reports its path.
3. **Actor:** The contributor replaces starter placeholders with reviewed
   content. **System:** The system preflight command reports every blocking
   schema, relationship, authority, coverage, and lifecycle issue in one result.
4. **Actor:** The responsible human supplies a review outcome, date, and
   authority. **System:** The review command verifies that the requested
   transition is legal, records exactly that supplied decision, and revalidates
   the affected state.
5. **Actor:** The Maintainer or agent requests an execution transition already
   authorized by an approved Plan. **System:** The transition command checks
   dependencies and evidence requirements, applies only the allowed state
   change, and reports the new state and next eligible operation.
6. **Actor:** The agent continues the applicable workflow. **System:** The
   workflow and skill guidance require the supported CLI operation and prohibit
   manually reproducing its mutation except documented recovery after a CLI
   failure.

### Alternative flows

- **A1 — Feature changes requested.** Source step: 4. Condition: Product
  Authority does not approve the current Feature boundary. Behavior: keep or
  return the Feature to `proposed`, clear incompatible approval provenance,
  retain it for revision, and report revision and resubmission as the next
  action. No Feature `rejected` or `changes_requested` status is introduced.
  Resume at step: 3.
- **A2 — Plan changes requested.** Source step: 4. Condition: Repository
  Maintainer does not approve the current Plan shape. Behavior: set
  `approval.status` to `changes_requested`, record the decision date, keep
  execution status independent and unchanged, and report revision and
  resubmission as the next action. Resume at step: 3.
- **A3 — Material revision after approval.** Source step: 3. Condition: an
  approved Feature behavior or approved Plan scope/success criteria changes
  materially. Behavior: return Feature status to `proposed` or Plan approval to
  `pending`, invalidate affected downstream authority, and require review again.
  Resume at step: 4 after revision.

### Exception flows

- **E1 — Human authority missing.** Source step: 4. Failure: an agent invokes a
  review command without an explicit human outcome, date, or authority.
  Handling: reject the command and name the missing input. Prohibited: deriving
  approval from the request, artifact content, elapsed time, or agent confidence.
  Failure postcondition: review state and provenance are unchanged.
- **E2 — Preflight blockers.** Source step: 3. Failure: content, relationships,
  governing authority, or required coverage is incomplete or invalid. Handling:
  return all actionable blockers and no successful next-transition claim.
  Prohibited: recording approval or beginning execution. Failure postcondition:
  authored content is preserved and lifecycle state is unchanged.
- **E3 — Illegal execution transition.** Source step: 5. Failure: Plan approval,
  predecessor, Decision dependency, evidence, or aggregation requirements are
  unsatisfied. Handling: reject the transition with the exact failed condition.
  Prohibited: skipping intermediate states or mutating dependent artifacts.
  Failure postcondition: current execution state remains visible.
- **E4 — Concurrent or invalid mutation state.** Source step: 2, 4, or 5.
  Failure: another writer owns the mutation boundary or the staged aggregate is
  invalid. Handling: report the conflict and publish none of the requested
  transition. Prohibited: partial publication or automatic recovery guesses.
  Failure postcondition: the last valid authored state remains authoritative.
- **E5 — Unsupported operation.** Source step: 6. Failure: a workflow boundary
  has no CLI support. Handling: guidance names the manual fallback and requires
  validation afterward. Prohibited: claiming the CLI performed an unsupported
  operation. Failure postcondition: the limitation is explicit.

### Postconditions

- **Creation success:** A canonical starter exists at the configured path and
  the command reports its identity or directory.
- **Inspection success:** The actor receives current state, blockers, and
  eligible next operations without a file mutation.
- **Review success:** Repository state records exactly one explicit human
  review outcome with compatible provenance.
- **Execution success:** The requested Plan or Work Item transition is legal,
  validated, and visible without unrelated mutation.
- **Failure:** No invalid or partially applied lifecycle change is reported as
  success, and the actor receives an actionable next step.

## Requirements

- **FR-001 — Canonical creation [Observed]:** The CLI shall create Feature and
  Plan starters at configured canonical paths without overwriting authored
  content; Feature IDs and Plan directory names shall use safe allocation.
- **FR-002 — Workflow state [Inferred]:** A read-only CLI operation shall report
  review state, execution state, governing authority, unresolved blockers, and
  eligible next operations for a selected Feature, Plan, or Work Item.
- **FR-003 — Preflight [Observed]:** Before review or execution, one CLI check
  shall aggregate relevant schema, content, relationship, authority, coverage,
  dependency, and lifecycle findings.
- **FR-004 — Negative review semantics [Product Authority]:** A negative Feature
  review shall keep or return the Feature to `proposed`; a negative Plan review
  shall set `approval.status` to `changes_requested`; neither outcome is a new
  terminal rejected lifecycle state.
- **FR-005 — Feature review recording [Inferred]:** The CLI shall record only an
  explicit Product Authority Feature review outcome and compatible provenance.
- **FR-006 — Plan review recording [Observed]:** The CLI shall record only an
  explicit Repository Maintainer Plan approval outcome while keeping approval
  independent from execution status.
- **FR-007 — Execution transitions [Observed]:** The CLI shall change Plan and
  Work Item execution state only through transitions allowed by the lifecycle
  contract and current dependency/evidence state.
- **FR-008 — Required CLI use [Inferred]:** Canonical Feature, Plan, and Cook
  workflows and their installed skills shall invoke supported CLI operations at
  their corresponding boundaries and shall not hand-edit supported lifecycle
  mutations during normal operation.
- **FR-009 — Stable result [Observed]:** Human- and machine-readable output shall
  identify the target, old state, new state or unchanged result, blockers,
  affected paths, and next eligible operations; JSON output shall remain stable.
- **BR-001 [Observed]:** CLI automation records human authority but never grants
  it, selects an unresolved outcome, or starts coding automatically.
- **BR-002 [Observed]:** Review state and execution state remain separate, and
  no Work Item can start before Plan approval and dependency closure.
- **BR-003 [Observed]:** Canonical Markdown remains authoritative; no database,
  hidden trace, or agent transcript becomes lifecycle state.
- **BR-004 [Observed]:** Every mutation validates the complete staged result,
  preserves unrelated user changes, and follows repository locking and atomic
  publication contracts.
- **NFR-001 — Token-efficient guidance [Inferred]:** Workflow and skill text
  shall name concise commands and rely on CLI results for mechanical state so
  an agent need not reconstruct the same checks from multiple documents.
- **NFR-002 — Compatibility [Observed]:** Existing valid artifacts and current
  supported commands shall remain readable and operational after migration.
- **NFR-003 — Portability [Observed]:** Behavior shall remain consistent on
  supported macOS, Linux, and Windows environments and configured layouts.

## Acceptance

- [ ] Feature and Plan negative review behavior matches FR-004 without adding a
  new rejected lifecycle state.
- [ ] A CLI-created Feature starter validates and advances its monotonic ID once.
- [ ] A CLI-created Plan starter uses the configured Plan directory and valid
  canonical Plan/Work Item shapes without overwriting existing content.
- [ ] State inspection changes no files and reports current review/execution
  state, blockers, and next eligible operations.
- [ ] Feature and Plan review commands reject missing explicit human authority
  and record valid supplied outcomes with compatible provenance.
- [ ] Plan approval never changes execution status by itself.
- [ ] Illegal Plan or Work Item transitions leave files unchanged and identify
  every failed precondition relevant to the request.
- [ ] Legal execution transitions update only the expected lifecycle fields and
  preserve unrelated authored content.
- [ ] Feature, Plan, and Cook workflows and installed skills name and require
  the supported CLI commands, including the validated manual fallback when a
  command is unavailable or fails.
- [ ] Existing artifacts, configured layouts, and supported CLI commands pass
  compatibility, schema, integrity, workflow, skill, and end-to-end tests.

**Scenario: inspect before planning**
Given an approved Feature may have unresolved related authority
When the agent checks its workflow state before creating a Plan
Then the result lists every blocking Feature or Decision
And identifies Plan creation as eligible only when authority closure holds.

**Scenario: withhold approval from an agent**
Given a Feature is mechanically valid
And Product Authority has not supplied an explicit review outcome
When an AI agent runtime invokes the Feature review command
Then the command rejects the transition
And Feature approval state remains unchanged.

**Scenario: preserve Plan state separation**
Given a pending Plan passes preflight
When Repository Maintainer explicitly approves it
Then Plan approval becomes approved with supplied provenance
And Plan execution status remains pending.

**Scenario: block an ineligible Work Item**
Given a Work Item has an incomplete predecessor or unresolved Decision
dependency
When an execution transition to in progress is requested
Then the command rejects the transition with the blocking relationship
And no Work Item or Plan status changes.

## Relationships

- Specs: [[workflow-lifecycle]]
- Decisions: [[DEC-001-cli-command-parsing|DEC-001]],
  [[DEC-002-minimal-file-mutations|DEC-002]],
  [[DEC-005-separate-approval-and-execution-state|DEC-005]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]],
  [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]],
  [[FEAT-003-verify-harness-integrity|FEAT-003]],
  [[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]
- Plan: [[260716-2335-automate-harness-workflow-operations/plan|Plan]]
- Source: `src/cli/index.ts`
- Source: `src/core/lifecycle.ts`
- Source: `src/core/integrity.ts`
- Source: `docs/harness/workflows/feature.md`
- Source: `docs/harness/workflows/plan.md`
- Source: `docs/harness/workflows/cook.md`
