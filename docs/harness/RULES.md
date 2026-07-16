# Repository Harness Rules

This document defines the version-controlled, normative repository policies for
the file-based harness. Policy labels remain stable when wording evolves. These
policies are distinct from promoted `RULE-XXX` evidence artifacts, which capture
project-specific engineering guidance derived from recurring friction.

## Repository Rules

### R-001: Canonical Docs Root and Artifact Ownership
All durable harness documents reside under a single document root. By default, this is the `docs/harness/` directory. Alternatively, a repository-root `harness.yaml` file may configure the root and individual collection folders. The resolved effective directories must be strictly contained, distinct, and unambiguous. Artifacts are owned by their respective roles and must be stored in their resolved canonical folders:
- Features: `<features-folder>/FEAT-XXX-*.md` (default: `docs/harness/features/`)
- Specs: `<specs-folder>/*.md` (default: `docs/harness/specs/`)
- Decisions: `<decisions-folder>/DEC-XXX-*.md` (default: `docs/harness/decisions/`)
- Plans: `<plans-folder>/YYMMDD-HHmm-*/` (default: `docs/harness/plans/`)
- Reports: `<reports-folder>/REP-XXX-*.md` (default: `docs/harness/reports/`)
- Rules: `<rules-folder>/RULE-XXX-*.md` (default: `docs/harness/rules/`)
- The index `index.md` is resolved under the effective Harness root, is derived, and is owned exclusively by CLI tooling;
  humans must not edit its catalog or backlinks. Before the allocator exists in
  bootstrap development, a human-approved repository change may advance only a
  monotonic sequence counter and must never decrease or reuse it.

### R-002: No Trace Store
Durable harness business and engineering state is represented by readable
Markdown under the effective Harness directory. Introducing a hidden trace ledger, database
(such as SQLite), or parallel out-of-band state store is prohibited.

### R-003: Feature and Spec Distinction
A Feature (`FEAT-XXX`) defines observable business behavior and requirements
from a Business Analyst (BA) perspective. A Spec defines shared technical
constraints, architecture, APIs, data, testing, or conventions using a semantic
filename. A Feature is an authority document with its own lifecycle, not a
mandatory stage for every repository change. Technical-only work that preserves
observable behavior may proceed without inventing a Feature. Implementation
design does not belong in the Feature behavior; optional delivery-specific
design belongs in `design.md` beside its owning `plan.md`, while source paths may appear in Feature
Relationships only as evidence. Exact workflow status enums, transition
predicates, approval provenance, and aggregation rules belong in a semantic
lifecycle Spec rather than Feature flows.

### R-004: Immutable Monotonic IDs
All ID-bearing artifacts must receive a sequential, monotonic, immutable ID matching `FEAT-XXX`, `DEC-XXX`, `REP-XXX`, or `RULE-XXX` (where `XXX` is a three-digit zero-padded integer, starting from `001`). Once allocated, an ID is permanently reserved and cannot be reused, even if the artifact is deprecated, superseded, or deleted.

### R-005: Filename and Frontmatter Agreement
The ID embedded in an artifact's filename must match the `id` field in its YAML frontmatter exactly (e.g., `FEAT-001-checkout.md` must have `id: FEAT-001`). Retain the ID when updating the filename slug.

### R-006: Semantic Spec Names
Technical specifications must use semantic kebab-case filenames (e.g., `security-audit.md` or `database-guidelines.md`) and must never be prefixed with a numeric ID or a `SPEC-` prefix.

### R-007: Plan and Work Item Naming and Layout
Implementation plans must follow the YYMMDD-HHmm-slug directory layout under the resolved plans directory using local time (e.g., `<plans-folder>/260714-0100-implement-checkout/`). Each plan must contain a `plan.md` root and ordered `work-item-XX-*.md` children. It may contain one plain `design.md` sibling. When present, the Plan must link that exact path through `relationships.source_paths`; a Plan must not claim another Plan's design.
Each Work Item child is the persisted representation of one reviewable Work Item;
its kind, inline Tasks, and success evidence remain Markdown body content so the
current schema stays compatible. The Plan body must map every in-scope Feature
requirement, or every technical objective for technical-only work, to one or
more Work Items. A Task does not require a separate Plan or Story layer.

### R-008: Exact Five-Section Feature Contract and BA Actors
Every Feature document must contain exactly five H2 sections: `Introduction`, `Business Understanding`, `Requirements`, `Acceptance`, and `Relationships`.
Actors in a Feature must represent people, business roles, or external systems. They must never represent internal classes, functions, controllers, microservices, databases, or code modules.

### R-009: Observed, Inferred, and TBD Separation
Feature discovery must categorize requirements and repository findings explicitly:
- **Observed:** Direct evidence and explicit constraints from the user request.
- **Inferred:** Reasoned interpretations or logical derivations.
- **TBD:** Open questions requiring explicit human feedback.

### R-010: Minimal and No-Filler Documents
Artifacts must be concise and free of boilerplate, placeholder text, or empty headings. Sections that are optional or contain no material content must be omitted rather than containing "TBD" or remaining blank, except when explicitly signaling an open question.

### R-011: Wikilink Format
All cross-references between artifacts must use Markdown wikilinks. ID-bearing artifacts use `[[full-basename|ID]]` (e.g., `[[FEAT-001-checkout|FEAT-001]]`). Specs use `[[semantic-basename]]` (e.g., `[[security]]`). External relative paths are used only in the `source_paths` frontmatter.

### R-012: Safe Rename, Deprecate, and Delete
Artifacts are deprecated by default rather than deleted. Deletion is a rare, destructive action that requires listing all affected inbound wikilinks and obtaining explicit human confirmation. A slug rename must update all inbound links atomically.

### R-013: Decisions and Supersession
Durable trade-offs must be recorded as decisions (`DEC-XXX`). When a decision is replaced, the new decision must include a `supersedes: [[DEC-old-slug|DEC-old]]` link, and the status of the old decision must be updated to `superseded` rather than deleting or rewriting its history.
Proposed and rejected Decisions are non-normative. Decision may interrupt
Feature, Plan, Cook, or Self Improve and must return to the boundary that raised
the durable choice after the required authority records its outcome.

### R-014: Workflow Approval Boundaries
Material state transitions require an explicit human gate: finalizing a Feature,
approving a Decision, approving a Plan for Cook, accepting destructive or
externally visible side effects, and promoting a Rule. Routine revision inside
an already authorized stage does not require a new gate unless scope changes.
Product Authority owns observable behavior and product choices; Repository
Maintainer owns technical Decisions and Plans. Plan approval must be stored
separately from execution state with its date and required authority. Before a
behavior-changing Plan is approved, every governing Feature must be approved and
no blocking Decision may remain unresolved. Authority closure, document
grounding, direct codebase scouting, any applicable Plan-local design, Work Item decomposition, and
requirement or technical-objective coverage are Plan approval preconditions,
not separate readiness artifacts or approval gates.

### R-015: Verification Evidence Before Completion
No implementation Task or Work Item can be marked complete without
executing its required verification tests, builds, static checks, or observable
checks. A Work Item completes only after its required Tasks and success criteria
have concrete passing evidence. Recording confidence-based assumptions without
concrete logs or outputs is prohibited.

### R-016: Required Delivery Reports
Every successful implementation plan must conclude by generating a Delivery Report (`REP-XXX`) in the resolved reports directory using `templates/report.md`. The report must record changed files, verification commands, plan variance, and repeated friction.
Plan completion is evidence-based and requires this Report. Product or high-risk
acceptance, when material, must be an approved Plan success criterion rather
than a second universal post-Report approval gate.

### R-017: Self-Improvement and Rule Promotion Requirements
Self Improve starts from verified Report or Decision evidence, classifies the
signal, and proposes the smallest change. It must never rewrite canonical
guidance automatically. A reusable rule (`RULE-XXX` in the resolved rules directory)
can only be promoted when:
1. At least two independent reports or decisions have recorded repeated friction under the same `recurrence_key`.
2. The evidence demonstrates a common reusable lesson (not just symptoms of a single incident).
3. A human explicitly reviews and approves the promotion.
This repository policy document (`RULES.md`) is distinct from these dynamically promoted `RULE-XXX` artifacts.

### R-018: CLI Deterministic Boundaries
The repository CLI tooling must preserve its documented command grammar,
repository-local artifact contracts, and reproducible outputs.

### R-019: Single-Writer and Atomic Writes
The harness MVP operates under a single-writer constraint. CLI-managed writes
must use a validated target, temporary sibling file, best-effort `fsync` or
equivalent flush, and atomic rename to the target path.

### R-020: Derived Index Ownership
The resolved `index.md` is owned and managed exclusively by the harness CLI tooling. Humans must not manually edit the index's catalog, backlinks, or relationships.
The sole bootstrap exception is advancing a monotonic sequence counter in an
explicitly human-approved repository change before the allocator command exists.
The generated body remains tooling-owned, and the exception expires once the
allocator is available.

### R-021: Optional Graphify and Privacy
`graphify` is an optional visualization utility for derived Harness-document
grounding within the boundary approved by DEC-006. It is not source-code
scouting and its output is not authority. Coding workflows inspect source,
dependencies, and tests directly. If the `graphify` dependency or command is
missing, the system must warn and degrade gracefully instead of failing
verification. Repository content must never be transmitted to external servers
without explicit user permission.

### R-022: Canonical Skills and Focused Utilities
The `.agents/skills/harness-*` skills are thin routers to the repository
workflow guides and templates. Focused repository-local utility skills may
provide reusable consultation, brainstorming, or scouting behavior, but must
not duplicate or override canonical artifact lifecycle authority. Every skill
must remain local and free of dependencies on personal or home-directory
configuration.

### R-023: Local-Reference and Provenance Checks
No skill, workflow, or script may depend on files or directories outside this repository's workspace. All adaptations of ClaudeKit behavior must be credited and detailed in `<harness-root>/PROVENANCE.md`.

### R-024: No Automatic Commit, Push, Release, or Deployment
Harness tools and workflows must never automatically commit changes, push to remote repositories, tag releases, or trigger production deployments. All delivery actions must remain manual and controlled by the human operator.

### R-025: Preserve User Changes
Tooling must not overwrite an existing untracked file or discard modified
working-tree content without explicit human approval.

### R-026: Cross-Platform Deterministic Output
Committed generated artifacts and snapshots must be cross-platform
deterministic. Canonical files use LF (`\n`) and repository-relative POSIX
paths. Runtime logs may contain timestamps or platform details and are not
canonical artifacts.

## Enforcement Map

| Rules | Enforcement and evidence |
| --- | --- |
| R-001–R-013 | Schema/content validation, filename checks, link checks, and template snapshot tests |
| R-014–R-017 | Workflow hard gates, plan status evidence, reports, and recurrence links |
| R-018–R-021 | CLI process tests, safe-write tests, index checks, and warning-only Graphify diagnostics |
| R-022–R-024 | Skill reference/provenance tests and adapter projection checks |
| R-025–R-026 | Existing-target guards, worktree inspection, LF snapshots, and cross-platform CI |

A test enforces only the behavior it directly observes. Until a later CLI Work Item
implements an enforcement point, the corresponding rule remains a documented
contract and must not be reported as mechanically enforced.
