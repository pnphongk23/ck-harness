# Cook Workflow

## Purpose
Implement an approved plan phase-by-phase, ensuring correctness through strict verification and producing a comprehensive delivery report.

## Use When
Use when an implementation plan under `docs/harness/plans/` has been approved and implementation is ready to begin.

## Inputs
- Approved plan directory `docs/harness/plans/YYMMDD-HHmm-slug/` containing `plan.md` and phase files.
- Current codebase state.
- Project specifications and RULES.md.

## Hard Gates
- **Phase Sequence Gate:** You must work on exactly one phase at a time. Do not begin work on phase N+1 until phase N is fully completed and verified.
- **Evidence Gate:** No phase or task can be claimed complete without concrete verification evidence (command logs, test outputs, or build success).
- **No Automatic Delivery Gate:** You must never automatically commit, push, or deploy changes.

## Procedure
1. **Prepare Phase:** Select the next pending phase. Mark its status in the phase file as `in_progress`.
2. **Read Stubs first:** Read any existing files or generated code stubs that will be replaced in this phase before writing new implementation.
3. **Execute Smallest Change:** Make the minimal code modifications needed to satisfy the current phase requirements.
4. **Compile and Type Check:** Run compiler and type checking commands (e.g. `npm run check`) to ensure syntax correctness.
5. **Run Verification:** Execute the tests or checks specified in the phase's success criteria.
6. **Review Changes:** Inspect the git diff for unintended side effects or scope drift.
7. **Document Outcome:**
   - If the check passes: record the command output, and mark the phase `completed`.
   - If a success criterion check cannot be executed (e.g., missing dependencies, mock issues, hardware limits), write exactly this text: `Tôi không thể xác minh điều này hoạt động vì...` followed by the concrete, detailed reason, and leave the criterion incomplete.
8. **Reconcile plans:** Proceed through subsequent phases sequentially.
9. **Deliver Report:** Once all phases are completed, allocate the next monotonic `REP-XXX` ID and copy `templates/report.md` to `reports/REP-XXX-*.md`. Document the outcome, changed files, verification logs, plan variance, and repeated friction.

## Output
- Verified code changes in the repository.
- Updated plan and phase files with `completed` statuses.
- A Delivery Report `docs/harness/reports/REP-XXX-*.md` conforming to `schema-v1.md`.

## Completion Criteria
- Every phase in the plan is marked `completed`.
- Every completed success criterion has passing evidence. A criterion carrying
  the exact Vietnamese block disclosure remains incomplete, so its phase and
  the overall plan cannot be marked `completed`.
- A completed Delivery Report (`REP-XXX`) exists and contains verification evidence.
- The codebase builds and passes all automated checks successfully.

## Prohibited Actions
- Do not work on multiple phases in parallel.
- Do not hide failures or write confidence-based language (e.g., "This should work") instead of executing tests.
- Do not automatically commit, push, release, or deploy changes.
- Delegation is optional, never mandatory. If the active runtime uses a bounded
  worker, one writer owns the checkout and the same plan, evidence, review, and
  human side-effect gates still apply.

## Failure and Recovery
- **Blocked Verification:** If a test cannot run, use the exact Vietnamese block disclosure `Tôi không thể xác minh điều này hoạt động vì...` and present the block to the user.
- **Compilation/Test Failure:** Preserve user changes, investigate the failure,
  and fix or revise only the authorized implementation. Do not discard the
  working tree or proceed to the next phase while a failure exists. Reverting
  user-owned content requires explicit approval.
- **Handoff Boundary:** Once the Delivery Report is written and approved by the
  human, hand off to Self Improve when the report contains friction, stale
  guidance, missing validation, or a reusable lesson; otherwise conclude.
