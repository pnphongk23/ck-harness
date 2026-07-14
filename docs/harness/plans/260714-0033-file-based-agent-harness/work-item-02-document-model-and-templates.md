---
work_item: 2
title: "Document Model and Templates"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1]
decision_dependencies: []
---

# Work Item 2: Document Model and Templates

## Overview

Define concise, testable templates for features, shared specs, decisions, plans, reports, and promoted rules. Feature documents use a BA perspective and capture observable business behavior without becoming full SRS documents.

## Requirements

- Feature template contains exactly five top-level sections: Introduction, Business Understanding, Requirements, Acceptance, Relationships.
- Actors are business roles or external systems, never code classes, services, or modules.
- Main, alternative, and exception flows follow consistent BA rules and include observable actor/system behavior.
- Shared specs describe project-wide architecture, APIs, database, security, conventions, testing, and similar concerns; they have no generated IDs.
- Templates contain no empty optional sections by default.
- Every relationship is expressible as an Obsidian wikilink and indexable without Graphify.

## Feature Template Contract

1. **Introduction**
   - Purpose.
   - In scope.
   - Out of scope.
2. **Business Understanding**
   - Actors: name, type, goal, responsibility.
   - User needs.
   - Preconditions.
   - Trigger.
   - Main flow: ordered actor action and system response.
   - Alternative flows: source step, condition, behavior, resume/end point.
   - Exception flows: source step, failure, handling, prohibited behavior.
   - Success and failure postconditions.
3. **Requirements**
   - Stable `FR-XXX` functional requirements using EARS where useful.
   - Business rules using `BR-XXX`.
   - Only relevant non-functional requirements.
4. **Acceptance**
   - Verifiable checklist.
   - Given/When/Then scenarios for primary, alternative, and critical negative paths.
5. **Relationships**
   - Specs, decisions, CK plans, reports, promoted rules, related features, and source-code paths.

## Related Code Files

- Create: `docs/harness/templates/feature.md`.
- Create: `docs/harness/templates/{decision,report,rule}.md`.
- Create: shared spec starter templates only where universally useful.
- Create: `src/core/schemas/` and template fixtures under `tests/fixtures/`.

## Implementation Steps

1. Define minimal frontmatter schemas for each artifact type.
2. Build the feature template with examples that clearly distinguish BA actors from implementation components.
3. Specify flow rules and validation:
   - Main flow has one success path and ordered steps.
   - Alternative flow identifies its branching step and continuation point.
   - Exception flow identifies failure handling and resulting postcondition.
4. Define decision records with context, decision, alternatives, consequences, evidence, and supersession links.
5. Define reports with delivered outcome, changed files, verification evidence, plan variance, repeated friction, and optional rule-candidate metadata.
6. Define rules with imperative guidance, scope, rationale, evidence links, exceptions, and verification method.
7. Define shared spec examples: `architecture.md`, `api-overview.md`, `database.md`, `security.md`, `testing.md`, and `conventions.md`; create only selected files during init.
8. Add schema and snapshot tests for valid and malformed artifacts.
9. Document how an agent may derive a feature from an existing codebase while marking observations, inferences, and TBDs separately.

## Risks

- Feature and spec content can duplicate each other; feature owns business behavior, spec owns project-wide technical context.
- Overly strict templates create filler; require only the five feature sections and material subsections.
- EARS and BDD can restate the same behavior; EARS is normative and BDD demonstrates acceptance examples.

## Success Criteria

- [x] Feature template contains the approved five-section structure and no rejected SRS sections.
- [x] Main, alternative, and exception flow examples pass schema/content validation.
- [x] Actor examples are business-facing and contain no code-level roles.
- [x] Specs use semantic filenames without IDs.
- [x] Decision, report, and rule templates include wikilink relationship fields.
- [x] Template snapshots are deterministic across operating systems.

## Verification Evidence

- `npm test` passed valid/malformed schema, filename/ID drift, flow/actor, YAML
  round-trip, and SHA-256 template snapshot tests on 2026-07-14.
