---
title: "Initialize skill files and consolidate schema guidance"
description: "Extend Harness init with packaged skill files while keeping internal repository documents out of initialized workspaces and moving the schema contract into canonical workflows."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-15
priority: P1
effort: "2 hours"
branch: "main"
tags: [harness, cli, init, skills, workflows]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  plans: []
  reports:
    - "[[REP-007-initialize-skill-files-and-consolidate-schema-guidance|REP-007]]"
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]"
  source_paths:
    - package.json
    - src/core/integrity.ts
    - src/core/lifecycle.ts
    - src/core/schemas/artifacts.ts
    - src/core/skill-routing.ts
    - tests/cli-lifecycle.test.ts
    - tests/integrity.test.ts
    - tests/workflows.test.ts
created: "2026-07-15T23:41:25+07:00"
createdBy: "Codex"
source: "Repository Maintainer request to initialize skill files and keep internal documentation out of init"
---

# Initialize skill files and consolidate schema guidance

## Overview

Keep `harness init` idempotent and allowlisted, but add every registered
`.agents/skills/<name>/SKILL.md` to the initialized workspace. Stop initializing
the internal `RULES.md` and `schema-v1.md` documents; `SKILL-PORTS.md` remains
internal and is not added to init. Preserve the initialized repository contract,
templates, workflows, artifact directories, and generated index.

The schema audit found contract details not yet present in workflows. Move those
details into the artifact contract section of `docs/harness/workflows/README.md`,
route index and doctor references to that canonical workflow router, then remove
`schema-v1.md` from the source tree and package allowlist. No separate `design.md` is needed because
the implementation extends the existing explicit-copy boundary without adding
a new architecture or reusable technical decision.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Initialize skills and consolidate schema guidance](./work-item-01-init-skills-and-schema-guidance.md) | Completed |

## Requirement coverage

| Requirement or objective | Delivering Work Item |
| --- | --- |
| FEAT-001 FR-001 — idempotent allowlisted initialization | 1 |
| FEAT-001 BR-003 — disclose and contain every mutated path | 1 |
| FEAT-003 — integrity diagnostics use canonical Harness sources | 1 |
| FEAT-005 — repository-local Harness skills are available in initialized workspaces | 1 |
| Maintainer exclusion — do not init `RULES.md`, `schema-v1.md`, or `SKILL-PORTS.md` | 1 |
| Maintainer consolidation — preserve all schema-v1 contract details under workflows before deletion | 1 |

## Verification ledger

| Claim | Status | Evidence |
| --- | --- | --- |
| Init currently copies only root docs, templates, and workflows | Verified | `src/core/lifecycle.ts` defines `INIT_ROOT_FILES` and the two copied directories |
| Registered skill inventory is deterministic | Verified | `src/core/skill-routing.ts` exports `skillNames`; `tests/skills.test.ts` checks the exact on-disk inventory |
| Every current skill is one `SKILL.md` file | Verified | `find .agents/skills -type f` returned eight `SKILL.md` paths and no support files |
| `schema-v1.md` contains details missing from workflows | Verified | Audit found filename/frontmatter tables, relationship constraints, ID rules, and status provenance absent from `docs/harness/workflows/*.md` |
| Schema enforcement remains executable after deleting the prose file | Verified | `src/core/schemas/artifacts.ts` owns strict Zod schemas and filename validation |
| Existing skill-workflow Plan conflicts with this scope | Verified as non-blocking | Its two Work Items are completed and `REP-006` records delivery; this Plan changes distribution, not skill content |
| Exact relevant checks are available | Verified | `npm run verify`, focused Node test files, CLI validation/index/doctor, package dry-run, and `git diff --check` exist in repository scripts/history |

Verification totals: 7 Verified, 0 Failed, 0 Unresolved.

## Dependencies and risks

- Preserve all pre-existing dirty worktree changes, especially the current
  `package.json` aliases and newly added skills.
- Use `skillNames` as the init allowlist so unregistered internal directories are
  not copied accidentally; each initialized skill path remains non-overwriting.
- Removing `schema-v1.md` requires updating doctor prerequisites, deterministic
  index core links, package contents, tests, and the one Decision source link.
- Keep the shared schema contract in `workflows/README.md` because every document
  and coding workflow enters through that router; do not add another workflow file.
- The initialized `README.md` remains public because it is the repository-facing
  command contract and was not named as an internal exclusion.
- `RULES.md` and `SKILL-PORTS.md` remain canonical internal repository sources;
  this Plan only excludes them from initialized workspaces.

## Adversarial review

- Security/privacy: copied paths are static package-owned Markdown under the
  workspace; containment and non-overwrite behavior remain unchanged.
- Failure mode: a missing packaged skill must fail init truthfully rather than
  silently create a partial claimed skill inventory.
- Compatibility: existing initialized files are preserved, and a second init
  adds only missing allowlisted skills.
- Scope/complexity: reuse the registered inventory and existing `copyIfMissing`;
  do not introduce a manifest format or recursive arbitrary file copier.

## Whole-Plan consistency

- Re-read this root and Work Item after drafting.
- Zero unresolved contradictions, stale names, duplicate contracts, dependency
  conflicts, or superseded assumptions found.

## Approval evidence

- Product behavior is governed by approved FEAT-001, FEAT-003, and FEAT-005.
- Repository Maintainer approved this Plan, its single Work Item, risks,
  coverage, and success criteria on 2026-07-15.
