# Plan Workflow

## Purpose
Design a phased, deterministic implementation sequence for an approved Feature and its associated Decisions before any code is modified.

## Use When
Use after a Feature (and necessary Decisions) has been approved, and before writing code to implement the capability.

## Inputs
- Approved Feature (`FEAT-XXX`) and relevant Decisions (`DEC-XXX`).
- Existing plans in `docs/harness/plans/` to identify unfinished or overlapping work.
- Existing specifications.

## Hard Gates
- **Overlap Check Gate:** All unfinished related plans in the repository must be scanned to avoid duplicate or conflicting phases.
- **Verification Gate:** Every phase must have a checkable, executable success criterion (no purely manual/confidence-based criteria without verification commands).
- **Human Approval Gate:** The plan directory and its phases must be approved by the human before implementation begins.

## Procedure
1. **Scan Existing Plans:** Identify any related or unfinished plans under `docs/harness/plans/` that could intersect with the new feature.
2. **Setup Directory:** Use `ck plan create --dir docs/harness/plans/...` when
   ClaudeKit 4.4.0 is available, or create an equivalent directory manually.
   Preserve the CK format `YYMMDD-HHmm-slug`, including an issue segment when
   configured (for example `260714-0100-GH-123-checkout-flow`).
3. **Draft Plan Root:** Create `plan.md` in that directory. Define YAML frontmatter containing title, description, status (`pending`), priority (P1/P2/P3), effort, branch, tags, dependencies, and author metadata.
4. **Draft Phases:** Create phase markdown files sequentially: `phase-01-*.md`, `phase-02-*.md`, etc.
   - For each phase, specify the phase number, title, status (`pending`), requirements, affected files, detailed implementation steps, risks, dependencies, and checkable success criteria.
5. **Read Generated Files:** If a tool scaffolded the plan, read `plan.md` and
   every generated phase stub before replacing their contents.
6. **Establish Verification Checks:** For each success criterion, specify the exact command (e.g. `npm test`, `npm run check`) or observable file output used to verify the change.
7. **Local Validation (Optional):** If ClaudeKit 4.4.0 is installed, run
   `ck plan validate <plan.md> --strict` and `ck plan status <plan.md>`. The
   Markdown plan must remain usable when CK is unavailable.
8. **Submit for Approval:** Request explicit human sign-off on the plan directory and phase sequence.

## Output
An approved plan directory `docs/harness/plans/YYMMDD-HHmm-slug/` containing `plan.md` and phase files conforming to `schema-v1.md`.

## Completion Criteria
- All plan files are syntactically valid and contain correct YAML frontmatter.
- Every phase success criterion has a clear, executable verification command or test.
- Plan status remains in the schema-supported vocabulary (`pending` before Cook;
  `in_progress`, `completed`, or `blocked` during execution). Human approval is
  recorded as the workflow handoff, not as an unsupported status value.
- No implementation code has been modified in the workspace.

## Prohibited Actions
- Do not write or edit any application code or tests during the planning phase.
- Do not create plans outside the `docs/harness/plans/` root.
- Do not bypass verification criteria; every phase must be independently testable.

## Failure and Recovery
- **Conflicting Plans:** If another plan covers the same files or logic, pause planning, reconcile the dependency with the user, and update the phase dependency list.
- **Validation Failures:** Correct frontmatter issues or dependency loops, and re-run check scripts.
- **Handoff Boundary:** Once the plan is approved, hand off to the Cook Workflow to start the step-by-step implementation.
