---
phase: 4
title: "CLI Core and Validation"
status: pending
priority: P1
effort: "5-7 days"
dependencies: [1, 2, 3]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-crash-recoverable-file-mutations|DEC-002]]"
  - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
---

# Phase 4: CLI Core and Validation

## Overview

Implement the deterministic CLI core, artifact creation, ID allocation, safe rename/deletion, validation, and cleanup behavior. This is the only mutation boundary for normal harness operations.

## Command Contract

```text
harness init
harness feature create|list|show|rename|deprecate|delete
harness new spec|decision|report|rule
harness validate [path]
harness index build|check
harness watch
harness rule candidates
harness adapters sync|check
harness graph check|build
harness doctor
harness clean
```

The CLI may execute deterministic local helpers such as Graphify when explicitly requested, but it must never launch an AI agent or silently execute verification, Git, network, commit, push, or deployment actions.

## Architecture

- `src/cli/`: command parsing, exit codes, human/JSON output.
- `src/core/ids.ts`: monotonic sequence allocation and filename validation.
- `src/core/artifacts.ts`: artifact models and relationship extraction.
- `src/core/validation.ts`: schemas, cross-file invariants, and diagnostics.
- `src/fs/atomic-write.ts`: safe writes, path containment, and rename.
- `src/fs/repository.ts`: repository-root discovery and canonical paths.

## Mutation Semantics

- Lock CLI-owned mutations to one process per repository.
- Reject writes outside the repository and `docs/harness/` allowlist.
- Create IDs from the sequence stored in `index.md` frontmatter.
- Increment sequence before publishing a newly allocated feature file; never decrement it.
- Validate temporary output before atomic replacement.
- Feature rename preserves frontmatter ID, updates filename slug and inbound wikilinks, then rebuilds the index.
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
4. Implement parsers and schema validation for frontmatter, headings, IDs, filenames, statuses, relationships, and wikilinks.
   Validate approval provenance, Decision dependencies, authority conflicts,
   lifecycle transitions, and Cook eligibility from [[workflow-lifecycle]].
5. Implement monotonic feature allocation and generic counters for decision/report/rule artifacts.
6. Implement create/list/show operations and deterministic template rendering.
7. Implement rename with inbound-link rewrite and rollback on validation failure.
8. Implement deprecate/delete safety rules and clear broken-link reporting.
9. Implement `validate` for one file, one artifact type, or the full harness.
10. Implement safe `clean` with protected user-authored Markdown and generated-path allowlists.
11. Add a process-spawn boundary test proving no agent executable is invoked by ordinary commands.

## Risks

- Crashes between multiple file replacements can leave partial link rewrites; stage all outputs, validate them together, then publish under a repository mutation lock.
- Symlink traversal can escape the workspace; resolve real paths and reject unexpected targets.
- Windows rename and watcher behavior differs from POSIX; retry only bounded transient sharing violations.

## Success Criteria

- [ ] `harness init` is idempotent and creates only the documented allowlist.
- [ ] The first feature is `FEAT-001-*`, the next is `FEAT-002-*`, and a deleted ID is never reused.
- [ ] Malformed, duplicate, mismatched filename/frontmatter IDs fail validation.
- [ ] Rename updates all inbound links or leaves the repository unchanged on failure.
- [ ] Referenced features cannot be hard-deleted by default.
- [ ] `clean --dry-run` reports exactly what would be removed.
- [ ] CLI commands never start an agent process.
