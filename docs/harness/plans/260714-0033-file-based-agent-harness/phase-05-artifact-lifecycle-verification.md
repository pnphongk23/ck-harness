---
phase: 5
title: "Artifact Lifecycle Verification and Release Readiness"
status: blocked
status_reason: "Required Linux and Windows verification evidence is unavailable until an external CI run is authorized and completed."
priority: P1
effort: "3-4 days"
dependencies: [3, 4]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
---

# Phase 5: Artifact Lifecycle Verification and Release Readiness

## Overview

Verify the complete approved FEAT-001 lifecycle across supported platforms and realistic fixture repositories, document its mutation limits and manual crash-repair expectation, audit the package, and produce the required Delivery Report. Do not test or claim delivery of proposed FEAT-003–005 behavior.

## Test Matrix

- Unit: command routing, slugging, ID allocation, canonical rendering, path containment, lifecycle transitions, cleanup allowlists, and mutation conflict classification.
- Integration: initialization, artifact creation, Feature list/show/rename/deprecate/delete, cleanup preview, confirmed cleanup, and DEC-002 handled-failure behavior.
- Negative: duplicate or rollback-prone counters, filename/frontmatter mismatch in staged output, referenced deletion, path traversal, symlink escape, existing-target conflict, interrupted multi-file mutation, and divergent external edits.
- Compatibility: macOS, Linux, and Windows; nested working directories; paths containing spaces; and non-ASCII titles that produce deterministic slugs.
- Package: typecheck, test, build, packed-content audit, and FEAT-001 CLI smoke tests from the packed artifact.
- Security: prove FEAT-001 commands do not spawn agent binaries, access the network, invoke Git, expose secrets, or write outside owned repository paths.

## Acceptance Scenarios

1. Fresh repository initialization creates only missing allowlisted paths and preserves existing content.
2. Consecutive artifact creation reserves increasing immutable IDs before publication and never reuses a retired ID.
3. Feature list and show return deterministic results without modifying repository files.
4. Rename preserves Feature identity and publishes every resolvable inbound-link change as one successful lifecycle outcome.
5. Referenced deletion fails by default and identifies referring artifacts.
6. Cleanup preview changes nothing; confirmed cleanup removes only allowlisted disposable output.
7. A detected external change blocks publication; a handled publication failure attempts rollback and reports any path requiring inspection.
8. Packed FEAT-001 commands behave consistently on supported environments and perform no hidden external action.

## Related Code Files

- Create or update FEAT-001 unit, integration, bounded handled-failure, and end-to-end fixture tests.
- Create CI coverage for supported Node versions and operating systems required by FEAT-001.
- Create or update artifact-lifecycle usage, mutation-limit, manual-repair, troubleshooting, and release-readiness documentation.
- Modify package metadata and README installation instructions only as required to deliver the approved lifecycle command surface.
- Create the required Delivery Report under `docs/harness/reports/` after every success criterion has passing evidence.

## Implementation Steps

1. Complete unit and integration coverage for every FEAT-001 command and invariant.
2. Add adversarial fixtures for staged validation, external-change rejection, handled publication failure, best-effort rollback reporting, and later detection of inconsistent state.
3. Run the lifecycle matrix on macOS, Linux, and Windows, recording exact command evidence or an explicit verification blocker.
4. Run typecheck, tests, build, package-content audit, and packed FEAT-001 CLI smoke tests.
5. Verify the Plan remains CK-compatible and every phase relationship and Decision dependency resolves.
6. Audit tracked output so no build, cache, temporary sibling, Graphify, watcher, adapter, or agent log artifact is included accidentally.
7. Document single-writer limits, non-atomic multi-file publication, manual crash repair, conflict handling, cleanup ownership, and unsupported proposed capabilities.
8. Produce the Delivery Report with changed files, exact verification evidence, Plan variance, and repeated friction.
9. Do not mark this phase or Plan complete until every required criterion passes and the Delivery Report exists.

## Risks

- Multi-file publication is deliberately not crash-recoverable in this MVP; documentation and tests must not imply automatic recovery or batch atomicity.
- Filesystem rename and sharing behavior differs on Windows; bounded compatibility evidence is required rather than assuming POSIX behavior.
- Package contents may accidentally expose commands for unapproved Features; packed-artifact smoke tests must assert the exact FEAT-001 command surface.
- Cross-platform CI or local environments may be unavailable; unavailable required evidence prevents completion and must be disclosed exactly.

## Success Criteria

- [x] `npm run check`, the complete automated test suite, build, and package-content audit pass with exact command evidence.
- [x] Fresh and partially initialized fixture repositories prove idempotent initialization and preservation of existing content.
- [x] Artifact creation, monotonic allocation, list, show, rename, deprecate, deletion safety, cleanup preview, and confirmed cleanup pass positive and negative integration tests.
- [x] Bounded handled-failure tests prove staged validation, divergent-user-change rejection, best-effort rollback reporting, and later rejection of detected inconsistent state.
- [ ] Supported macOS, Linux, and Windows evidence covers path containment, spaces, non-ASCII titles, and platform-specific rename behavior.
- [x] Packed-artifact smoke tests expose only the approved FEAT-001 command surface and prove no hidden agent, Git, network, release, or deployment action.
- [x] Documentation states per-file atomicity, non-atomic multi-file publication, manual crash repair, cleanup ownership, and that FEAT-003–005 capabilities are not delivered.
- [ ] A completed Delivery Report records changed files, exact verification commands and outputs, Plan variance, limitations, and repeated friction.

## Verification Evidence

- `npm run verify` passed 32 tests on macOS ARM64 with Node 24.16.0 and npm 11.13.0 on 2026-07-14.
- The automated suite covers fresh and partial initialization, canonical artifact scaffolding, immutable allocation, list/show read-only behavior, rename and backlink rewrite, deprecation, referenced deletion, cleanup preview/removal, strict CLI grammar, spaces, nested working directories, Vietnamese slugging, duplicate-ID rejection, symlink containment, divergent edits, handled rollback, non-rollback ID reservation, and staging cleanup.
- `npm_config_cache=<temporary> npm pack --dry-run --json` passed; the allowlisted package contained 63 files, included the CLI and canonical Harness docs, and excluded compiled tests.
- A real tarball was created in a temporary directory, extracted, connected only to the already-installed dependency tree, and its packaged binary passed `--version`, `init`, Vietnamese-title `feature create`, `feature rename`, and `feature list` against a repository path containing spaces.
- Static boundary tests and source review found no `node:child_process`, agent spawn, Git, network, release, deployment, recovery, validation, watch, graph, adapter, or doctor command path in the FEAT-001 CLI.
- `.github/workflows/verify.yml` parses successfully and defines macOS, Ubuntu, and Windows jobs for Node 20, 22, and 24; this configuration is pending its first external CI run.
- `ck plan validate docs/harness/plans/260714-0033-file-based-agent-harness/plan.md --strict` passed with 0 errors and 0 warnings.
- `git diff --check` passed, and the workspace audit found no tarball, lock, staged sibling, or rollback temporary file.

## Current Verification Blocker

Tôi không thể xác minh điều này hoạt động vì... môi trường hiện tại chỉ cung cấp macOS ARM64; Docker CLI có mặt nhưng Docker daemon không chạy, không có Windows runtime, và chưa có CI run vì Cook không được tự động commit, push, hoặc tạo hoạt động bên ngoài. Linux và Windows matrix evidence therefore remains required before this phase, the Delivery Report, and the Plan can be completed.
