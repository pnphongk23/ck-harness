# Decision Workflow

## Purpose
Evaluate and record durable technical or product trade-offs that have a lasting impact on the codebase or architecture.

## Use When
Use when there are multiple viable technical paths, database schemas, library selections, or architectural approaches that require selecting one over others.

## Inputs
- An approved Feature (`FEAT-XXX`) for feature-scoped choices, or a semantic
  project Spec for project-wide choices.
- Project technical specs (`docs/harness/specs/*.md`).
- Existing decision log and code constraints.

## Hard Gates
- **Alternative Viability Gate:** At least 2-3 credible alternatives must be formally evaluated.
- **Human Approval Gate:** The final decision and its trade-offs must be approved by the human before finalizing.

## Procedure
1. **Analyze Constraints:** Read the index, the linked feature, and relevant specifications.
2. **Formulate Alternatives:** Identify 2-3 credible alternatives, listing the simplest viable choice first.
3. **Evaluate Trade-offs:** Record the advantages, disadvantages, and technical consequences of each alternative.
4. **Draft Decision:** Allocate the next monotonic `DEC-XXX` ID. Copy `templates/decision.md` to `decisions/DEC-XXX-kebab-slug.md`.
5. **Handle Supersession:** If this choice replaces an older decision, set the `supersedes` key in the frontmatter to the old decision's wikilink, and update the old decision's status to `superseded` in its file.
6. **Set Recurrence Key:** If the decision deals with friction that has been encountered repeatedly in reports or previous decisions, define a stable `recurrence_key`.
7. **Obtain Approval:** Present the alternatives and recommended choice to the human for approval.

## Output
An approved `docs/harness/decisions/DEC-XXX-*.md` artifact conforming to `schema-v1.md`.

## Completion Criteria
- Decision artifact is written using the exact structure from the template.
- Status is updated to `approved` after human selection.
- Inbound and outbound wikilinks are verified and resolved.
- Historical records are preserved (superseded files are marked `superseded`, not deleted or rewritten).

## Prohibited Actions
- Do not create plans or write production code during this workflow.
- Do not silently delete or rewrite the history of superseded decisions.
- Do not propose options that violate existing specifications or project rules without a corresponding spec update.

## Failure and Recovery
- **Rejection of Choice:** If the human rejects the recommended option, revise the alternative comparison, investigate other options, and re-submit for approval.
- **Ambiguous Consequences:** If consequences are unclear, consult existing specifications or run local spikes (without modifying production code) to gather evidence.
- **Handoff Boundary:** Once the Decision document is approved, hand off to the Plan Workflow to detail the implementation phases.
