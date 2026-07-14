# Feature Workflow

## Purpose
Discover, clarify, and document a new capability or existing behavior from a Business Analyst (BA) perspective. Define what the system should do without deciding how it will be implemented.

## Use When
Use when starting a new capability, resolving ambiguous requirement boundaries, or documenting existing behavior before modification.

## Inputs
- User request or issue description.
- Pre-existing features, specs, and code structure in the workspace.
- Evidence gathered from scouting the repository.

## Hard Gates
- **Scouting Gate:** Repository scouting must be completed before authoring.
- **Evidence Labeling Gate:** All requirements and constraints must be classified as **Observed**, **Inferred**, or **TBD**.
- **Human Approval Gate:** The feature boundary, scope, and proposed approaches must be explicitly approved by the human before the Feature artifact is finalized.

## Procedure
1. **Scout Repository first:** Search for relevant code, specs, and existing features using ripgrep or file analysis tools to establish facts.
2. **Collect Evidence:** Classify all findings:
   - **Observed:** Directly requested items, constraints, or documented facts.
   - **Inferred:** Reasonable interpretations of facts or requirements.
   - **TBD:** Uncertainties requiring human answers.
3. **Analyze Boundaries:** Identify the expected output, acceptance criteria, scope boundaries (in-scope vs. out-of-scope), non-negotiable constraints, and user touchpoints.
4. **Propose Approaches:** For complex requirements, outline 2-3 approaches, listing the simplest first.
5. **Request Human Review:** Present the collected findings, classifications, and proposed approaches to the user for feedback and selection.
6. **Author Artifact:** Allocate the next monotonic `FEAT-XXX` ID (do not reuse gaps). Copy `templates/feature.md` to `features/FEAT-XXX-kebab-slug.md`.
7. **Write Content:** Ensure the file contains exactly the five H2 sections: `Introduction`, `Business Understanding`, `Requirements`, `Acceptance`, and `Relationships`. Omit optional subsections if they contain no content rather than leaving placeholders.

## Output
An approved `docs/harness/features/FEAT-XXX-*.md` artifact conforming to `schema-v1.md`.

## Completion Criteria
- Feature artifact passes structural and content schema validations (exactly five H2 sections, filename ID matches frontmatter).
- No implementation terms are used in the Actor list (e.g. class, service, package).
- Human approval is obtained on the feature boundaries and approaches.
- All outgoing wikilinks resolve, and the operation introduces no broken inbound links.

## Prohibited Actions
- Do not create plans or modify product code during this workflow.
- Do not turn business behavior into an implementation design. Classes,
  services, libraries, and source paths belong in technical specs, decisions,
  plans, or Feature Relationships—not in the actor/flow model.
- Do not reuse deleted or existing Feature IDs.

## Failure and Recovery
- **Missing Information:** If evidence is insufficient, mark the gaps as **TBD** and request human clarification.
- **Approval Rejection:** If the human rejects the feature boundary or approaches, revert to the scoping step, revise the alternatives, and request approval again.
- **Handoff Boundary:** Once the Feature document is approved, hand off to the Decision Workflow (if trade-offs exist) or directly to the Plan Workflow.
