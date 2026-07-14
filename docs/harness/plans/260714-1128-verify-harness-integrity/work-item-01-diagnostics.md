---
work_item: 1
title: "Diagnostic Model and Repository Scan"
status: completed
priority: P1
effort: "3-4 days"
dependencies: []
decision_dependencies: []
---

# Work Item 1: Diagnostic Model and Repository Scan

## Overview

Create the read-only integrity domain model and one deterministic scanner for
canonical Harness Markdown. It must parse all supported artifact forms and
produce complete, source-located evidence without altering repository state.

## Implementation Steps

1. Define typed finding, severity, outcome, scope, and remediation structures
   with stable check identifiers and repository-relative POSIX paths.
2. Extract reusable parsing from lifecycle-only checks where safe; preserve
   lifecycle mutation behavior and do not expose a mutation path through the
   integrity module.
3. Scan canonical Harness locations, ignore owned disposable directories, and
   collect readable-document, filename, frontmatter, content, identity,
   relationship, wikilink, approval, lifecycle, and cross-document evidence.
4. Sort independent findings by path, location, check identifier, and message
   so equivalent repository evidence yields byte-stable structured results.
5. Define exact unsupported-root, ambiguous-target, unsupported-schema, and
   unreadable-document outcomes; do not guess a target or claim partial
   verification is complete.
6. Add fixtures that isolate each diagnostic category and assert that scanner
   invocation does not change the fixture worktree.

## Success Criteria

- [x] A full Harness scan returns structured findings whose paths are
      repository-relative POSIX strings and whose order is deterministic across
      repeated runs over the same fixture.
- [x] Fixtures for malformed YAML, filename/frontmatter disagreement,
      duplicate or mismatched IDs, broken wikilinks, invalid approval
      provenance, and invalid lifecycle state each yield source-specific error
      identifiers.
- [x] Unsupported repository, schema, or target conditions return a
      non-success outcome with remediation evidence and do not select a
      fallback scope.
- [x] Hashes and file listings before and after every scanner test are equal;
      no canonical document, index, cache, or temporary file is written.

## Verification Evidence

- `npm run check && npm run build && node --test dist/tests/integrity.test.js`
  passed on 2026-07-14: 2 scanner tests covered deterministic ordered
  findings, filename/ID/link/source-path/lifecycle diagnostics, missing-index
  precondition handling, and before/after fixture hashes.
- `npm test` passed on 2026-07-14: 34 tests passed, 0 failed.
- A read-only scan of this workspace reported existing stale FEAT-004/005
  source-path evidence and an incomplete separate FEAT-004 plan; it changed no
  repository files and those unrelated authored documents were preserved.
