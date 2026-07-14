---
schema_version: 1
title: Choose minimal file mutation semantics
relationships:
  specs: []
  decisions: []
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
  source_paths:
    - docs/harness/RULES.md
    - src/fs/index.ts
type: decision
id: DEC-002
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
---

# DEC-002: Choose minimal file mutation semantics

## Context

Feature creation can update a sequence and publish a new artifact, while Feature rename can replace several authored files. The filesystem provides atomic replacement for one path, not one transaction spanning every affected path. FEAT-001 requires single-writer, repository-contained changes that preserve detected user edits and never report a known partial result as success. The MVP should satisfy that boundary with the smallest implementation and does not require automatic recovery after process or machine failure.

This Decision interrupts the FEAT-001 Plan before Work Item 4.

## Decision

Use validated sibling-file writes with per-file atomic replacement and best-effort rollback only for failures detected while the command is still running.

For each mutation, the CLI will:

1. Acquire the repository's single Harness-writer boundary.
2. Read the affected paths, reject path or ownership violations, and retain their pre-mutation content for the duration of the process.
3. Render every requested result to temporary sibling files and validate the complete staged view before publishing any target.
4. Recheck that each affected target still matches the content read by this command; a detected external change aborts publication.
5. Replace targets one at a time using the platform's atomic single-file rename behavior.
6. If a handled publication error occurs, attempt to restore already replaced targets from the retained pre-mutation content and report the exact affected paths. The command must not claim success unless the complete requested result is visible and valid.
7. Remove temporary files on ordinary success or handled failure where possible.

Do not add a transaction manifest, durable backup ledger, automatic crash recovery, or `harness recover` commands. If the process or machine stops between file replacements, a partial multi-file result may remain. A later mutation must validate the relevant Harness state, refuse to build on detected inconsistency, and report the affected paths for manual correction. This MVP makes no claim of atomicity across multiple files.

## Alternatives

1. **Validated sibling writes with best-effort handled rollback — selected.** This is the smallest design that validates before publication, protects detected user edits, and provides truthful command outcomes. A process crash can still leave partial multi-file state requiring manual correction.
2. **Staged batch with durable manifest and explicit recovery commands.** This supports deterministic continuation or rollback after crashes but adds a transaction state machine, backup lifecycle, recovery UI, and substantially more failure modes than the current MVP requires.
3. **Whole-tree generations with an atomic active pointer.** This can switch one logical snapshot atomically but changes canonical paths, duplicates the Harness tree, and conflicts with normal Markdown editing and wikilink navigation.

## Consequences

- Work Item 4 can implement a small repository mutation boundary without a recovery subsystem or new public recovery commands.
- Each target replacement is atomic, but a batch spanning several paths is not atomic as a whole.
- Validation occurs before publication, and detected external changes block the mutation instead of being overwritten.
- Handled failures receive a best-effort in-process rollback; rollback failure is reported with every path whose outcome needs inspection.
- A process or machine crash may leave a partial multi-file state. The next relevant mutation must reject detected inconsistency and require manual repair.
- Tests cover staging validation, external-change rejection, handled publication failure, best-effort rollback reporting, temporary-file cleanup, and detection of inconsistent state on a later mutation. They do not require automatic crash continuation or rollback.
- A future requirement for unattended crash recovery must be introduced through a new superseding Decision rather than silently expanding this MVP.

## Evidence

- [[FEAT-001-harness-cli|FEAT-001]]
- [[260714-0033-file-based-agent-harness/plan|Plan]]
- `docs/harness/RULES.md` R-002, R-012, R-019, R-025, and R-026.
- `src/fs/index.ts` is currently a repository-scoped stub, so the simpler boundary avoids introducing a recovery subsystem before one is required.
- Node.js exposes write, flush, and rename operations per path; it does not provide one atomic transaction across several filesystem paths.
- Repository Maintainer direction on 2026-07-14 explicitly deferred recovery and selected the simplest viable mutation behavior.

## Supersession

This decision supersedes no earlier decision.
