---
schema_version: 1
title: Use Work Item terminology throughout Harness
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
  plans:
    - "[[260714-2331-use-work-item-terminology/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - docs/harness/plans/260714-2331-use-work-item-terminology/design.md
    - src/core/schemas/artifacts.ts
    - src/core/integrity.ts
    - src/core/skill-routing.ts
    - tests/artifacts.test.ts
    - tests/integrity.test.ts
type: report
id: REP-004
status: completed
delivered: 2026-07-14
---

# REP-004: Use Work Item terminology throughout Harness

## Delivered outcome

Harness now uses **Work Item** as the only name for an executable child of a
Plan. Canonical documents, filenames, frontmatter, diagnostics, skills, source,
and tests agree on `work-item-XX-*.md` and `work_item`; the former Plan-child
term has no compatibility alias in the active contract.

## Changed files

- Harness Features, DEC-008, lifecycle specification, Rules, workflows, schema,
  design, and skills — define and route the single-term Work Item model.
- Existing Plan directories and reports — migrate 18 child artifacts and all
  active inbound links while preserving lifecycle history and evidence.
- `src/core/schemas/artifacts.ts`, `src/core/integrity.ts`, and
  `src/core/skill-routing.ts` — enforce Work Item frontmatter, paths,
  diagnostics, lifecycle checks, and prompt routing.
- Artifact, integrity, index-resolution, skill, and workflow tests — verify the
  renamed contract and reject stale shapes.
- `AGENTS.md` and `CLAUDE.md` — retain short repository routers; newly injected
  GitNexus instruction sections were removed as requested.

## Verification evidence

- `npm run verify` — passed on 2026-07-14: TypeScript checks passed and 74 tests
  passed, 0 failed.
- `node dist/src/cli/bin.js validate --all` — passed with no findings.
- `node dist/src/cli/bin.js index check` — passed with no findings.
- `node dist/src/cli/bin.js doctor` — passed with no findings.
- `npm pack --dry-run` — passed with 66 allowlisted package entries.
- `git diff --check` — passed.
- Terminology audit confirmed all 18 Plan children use `work_item` and
  `work-item-XX-*.md`. The literal `research-phase` remains only as the exact
  filename of an upstream provenance reference in `SKILL-PORTS.md`.

## Plan variance

The first full test run exposed GitNexus text concurrently injected into the
two repository routers. That text was outside the approved Work Item contract
and violated the short-router invariant, so it was removed before rerunning the
complete verification suite. No compatibility alias was retained.

## Repeated friction

Using two names for one Plan-child concept caused ambiguity across planning,
execution, and validation. DEC-008 resolves the repeated naming friction by
making Work Item the only persisted and user-facing term.
