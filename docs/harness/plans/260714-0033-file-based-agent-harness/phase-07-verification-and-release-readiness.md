---
phase: 7
title: "Verification and Release Readiness"
status: pending
priority: P1
effort: "5-7 days"
dependencies: [3, 4, 5, 6]
---

# Phase 7: Verification and Release Readiness

## Overview

Verify the complete product contract across platforms and realistic fixture repositories, document limitations and recovery, and prepare a minimal releasable CLI without generated-file churn.

## Test Matrix

- Unit: ID allocation, slugging, schemas, link parsing, sorting, hashing, path containment, and adapter rendering.
- Integration: init, create, rename, deprecate, delete, validate, index build/check, watch, adapter sync/check, doctor, clean.
- Negative: duplicates, malformed frontmatter, counter rollback, ambiguous aliases, broken links, invalid plans, stale adapters, path traversal, partial temporary files.
- Watcher: insert/delete/move, atomic-save editors, burst changes, self-write suppression, invalid intermediate edits, shutdown/restart reconciliation.
- Compatibility: macOS, Linux, and Windows; paths containing spaces and non-ASCII feature titles.
- CK plan: create a fixture plan under `docs/harness/plans/`, run `ck plan validate/status`, and confirm directory plus phase naming.
- Runtime adapters: assert exact discovery locations and validate canonical references for Claude, Codex, Cursor, and Antigravity.
- Security: prove ordinary CLI commands do not spawn agent binaries, access secrets, write outside owned roots, or invoke network/Git side effects.

## Acceptance Scenarios

1. Fresh repository init creates only the documented allowlist.
2. Feature creation generates `FEAT-001-operation-dashboard.md`; the next feature receives `FEAT-002`.
3. Deleting or deprecating a feature never causes ID reuse.
4. Rename updates inbound `[[full-basename|FEAT-XXX]]` links and the index.
5. Manual insert/delete/move under watcher updates the index without loops.
6. `index check` fails on stale index, broken links, duplicate IDs, or filename/frontmatter mismatch.
7. CK-generated plan retains `{date}-{issue}-{slug}/plan.md` and `phase-XX-name.md` structure under `docs/harness/plans/`.
8. All runtime adapters pass checks; a deliberately broken reference is detected by doctor.
9. Missing Graphify reports warning; explicit Graphify failure returns its nonzero status without corrupting canonical documents.
10. `clean` removes only generated/cache artifacts and never deletes authored Markdown.

## Related Code Files

- Create: CI workflows for supported Node versions and operating systems.
- Create: end-to-end fixture repositories and golden outputs.
- Create: release checklist, migration/non-goals note, troubleshooting, and contributor guide.
- Modify: package metadata and README installation instructions.

## Implementation Steps

1. Complete unit and integration coverage for every command and invariant.
2. Add adversarial fixtures and failure-injection tests around staged multi-file mutations.
3. Run the full test matrix on macOS, Linux, and Windows.
4. Run lint, typecheck, build, package-content audit, and CLI smoke tests from the packed artifact.
5. Run CK plan validation/status against the plan fixture and record the installed CK version.
6. Verify runtime adapter paths against current official contracts and local discovery commands where available.
7. Verify no tracked `dist`, cache, Graphify output, watcher temp file, `.DS_Store`, or AGY log remains.
8. Document single-writer limits, watcher recovery, index rebuild, adapter conflict resolution, and Graphify optionality.
9. Produce a release-readiness report under `docs/harness/reports/` with exact command evidence.
10. Do not mark the plan complete until every required check passes; otherwise state the concrete verification blocker.

## Risks

- Filesystem event behavior differs by OS; correctness must rely on rebuild/check, not watcher delivery guarantees.
- Package contents can accidentally include source fixtures or generated adapters; audit the packed tarball.
- Runtime tooling may be unavailable in CI; separate structural adapter verification from optional live-runtime smoke tests and disclose gaps.

## Success Criteria

- [ ] Unit, integration, negative, watcher, and end-to-end tests pass on all supported platforms.
- [ ] Typecheck, lint, build, package audit, and packed CLI smoke tests pass.
- [ ] CK plan compatibility is demonstrated with command output.
- [ ] Four runtime adapter contracts are structurally verified and live-smoked where tooling permits.
- [ ] No generated/cache/log junk is tracked.
- [ ] Release-readiness report contains exact commands, outputs, remaining limitations, and no unsupported success claim.
