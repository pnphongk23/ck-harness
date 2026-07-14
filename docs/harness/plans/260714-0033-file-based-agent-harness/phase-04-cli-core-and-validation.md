---
phase: 4
title: "CLI Artifact Lifecycle"
status: completed
priority: P1
effort: "5-7 days"
dependencies: [1, 2, 3]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
---

# Phase 4: CLI Artifact Lifecycle

## Overview

Implement the deterministic FEAT-001 CLI boundary for initialization, canonical artifact scaffolding, Feature discovery and lifecycle mutation, monotonic ID allocation, and allowlisted cleanup. Internal contract validation supports safe publication; a public validation or health command is outside this phase.

## Command Contract

```text
harness init
harness feature create|list|show|rename|deprecate|delete
harness new spec|decision|report|rule
harness clean
```

The CLI must never launch an AI agent or silently execute Git, network, verification, commit, push, release, or deployment actions. Commands governed by FEAT-003–005 are not registered by this phase.

## Architecture

- `src/cli/`: command parsing, exit codes, human/JSON output.
- `src/core/ids.ts`: monotonic sequence allocation and filename validation.
- `src/core/artifacts.ts`: artifact models and relationship extraction.
- `src/core/validation.ts`: internal artifact and staged-result invariants required for safe lifecycle publication.
- `src/fs/atomic-write.ts`: safe writes, path containment, and rename.
- `src/fs/repository.ts`: repository-root discovery and canonical paths.

## Mutation Semantics

- Lock CLI-owned mutations to one process per repository.
- Reject writes outside the repository and `docs/harness/` allowlist.
- Create IDs from the sequence stored in `index.md` frontmatter.
- Increment sequence before publishing a newly allocated feature file; never decrement it.
- Validate the complete temporary lifecycle result before publication.
- Feature rename preserves frontmatter ID and publishes the filename slug plus resolvable inbound wikilink changes through validated per-file replacements with best-effort rollback for handled failures.
- Feature deletion fails when backlinks exist unless forced; deprecation is the default retirement path.
- `clean` removes only documented generated/cache paths and supports `--dry-run`.

## Related Code Files

- Create: `src/cli/`, `src/core/`, `src/fs/`.
- Create: `tests/unit/`, `tests/integration/`, fixture repositories.
- Modify: `package.json` scripts and binary entry.

## Implementation Steps

1. Implement repository-root discovery and path normalization for macOS, Linux, and Windows.
2. Implement CLI parsing, stable exit codes, `--json`, `--dry-run`, and actionable diagnostics.
3. Implement `init` as an idempotent allowlisted scaffold operation.
4. Reuse and extend internal parsers and contract checks only as required to validate artifacts and complete staged lifecycle mutations.
5. Implement monotonic feature allocation and generic counters for decision/report/rule artifacts.
6. Implement create/list/show operations and deterministic template rendering.
7. Implement rename with inbound-link rewrite, pre-publication validation, external-change detection, and best-effort rollback for handled publication failure.
8. Implement deprecate/delete safety rules and clear broken-link reporting.
9. Implement safe `clean` with protected user-authored Markdown and generated-path allowlists.
10. Add bounded handled-failure coverage required by DEC-002, including divergent-user-change rejection and explicit reporting when best-effort rollback cannot restore every path.
11. Add a process-spawn boundary test proving no agent executable is invoked by FEAT-001 commands.

## Risks

- Multi-file lifecycle changes are not batch-atomic; a process crash can leave partial state that a later mutation must detect and reject until manual repair.
- Symlink traversal can escape the workspace; resolve real paths and reject unexpected targets.
- Windows rename and watcher behavior differs from POSIX; retry only bounded transient sharing violations.

## Success Criteria

- [x] `harness init` is idempotent and creates only the documented allowlist.
- [x] Two consecutive ID-bearing creations receive consecutive immutable IDs, and deprecation or deletion never makes either ID reusable.
- [x] Each supported artifact command renders canonical content at its canonical repository path.
- [x] Feature list and show return the requested information without changing repository files.
- [x] Rename preserves the Feature ID and publishes every resolvable inbound-link change as one successful command outcome; detected external changes block publication, and handled partial failure triggers best-effort rollback plus exact path reporting.
- [x] Referenced features cannot be hard-deleted by default.
- [x] `clean --dry-run` reports exactly what would be removed.
- [x] Confirmed cleanup removes only allowlisted disposable output and never canonical authored Markdown.
- [x] No transaction manifest, durable backup ledger, automatic recovery behavior, or `harness recover` command is introduced.
- [x] FEAT-001 commands never start an agent process or perform hidden Git, network, verification, release, or deployment actions.

## Verification Evidence

- `npm run verify` passed 31 tests on 2026-07-14, including CLI lifecycle, monotonic allocation, read-only discovery, rename/backlink rewrite, deletion safety, cleanup allowlists, lock contention, divergent external edits, best-effort rollback, non-rollback ID reservation, staging cleanup, symlink containment, and forbidden command/process boundaries.
- `npm_config_cache=<temporary> npm pack --dry-run --json` passed on 2026-07-14; the audited package contained 63 allowlisted files, the CLI binary and canonical Harness docs, and no compiled tests.
- Built CLI smoke on 2026-07-14 passed `--version`, `--help`, `init`, `feature create`, `feature rename`, and `feature list` against a temporary repository.
- `ck plan validate docs/harness/plans/260714-0033-file-based-agent-harness/plan.md --strict` passed with 0 errors and 0 warnings on 2026-07-14.
