---
schema_version: 1
title: Initialize skill files and consolidate schema guidance
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  plans:
    - "[[260715-2341-init-skill-files/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]"
  source_paths:
    - docs/harness/workflows/README.md
    - package.json
    - src/core/integrity.ts
    - src/core/lifecycle.ts
    - tests/cli-lifecycle.test.ts
    - tests/integrity.test.ts
    - tests/workflows.test.ts
type: report
id: REP-007
status: completed
delivered: 2026-07-15
---

# REP-007: Initialize skill files and consolidate schema guidance

## Delivered outcome

`harness init` now copies every registered skill to
`.agents/skills/<name>/SKILL.md`, preserves existing skill content, and remains
idempotent. It no longer initializes or packages internal `RULES.md`,
`SKILL-PORTS.md`, or `schema-v1.md` documentation. The durable schema guidance
previously unique to `schema-v1.md` now lives in the Artifact Contract section
of the canonical workflow router.

## Changed files

- `src/core/lifecycle.ts` — copy the deterministic registered skill allowlist and
  reduce initialized root documentation to the public repository contract.
- `docs/harness/workflows/README.md` — own the shared artifact, relationship,
  lifecycle, Plan, Work Item, design, and Feature-content contracts.
- `docs/harness/schema-v1.md` — removed after its unique guidance was migrated.
- `src/core/integrity.ts` and `docs/harness/index.md` — route diagnostics and the
  generated core-document list to public workflow documentation.
- `package.json` — retain the user's command aliases while excluding internal
  rule and schema documents from the package.
- `docs/harness/decisions/DEC-005-separate-approval-and-execution-state.md` —
  replace the deleted schema source path with the workflow router.
- `tests/cli-lifecycle.test.ts`, `tests/integrity.test.ts`, and
  `tests/workflows.test.ts` — verify skill bytes, preservation, idempotency,
  internal exclusions, doctor prerequisites, index links, and migrated guidance.

## Verification evidence

- Focused build and test command passed 26 tests, 0 failed.
- `npm run verify` passed TypeScript checks and 76 tests, 0 failed.
- `harness validate --all`, `index check`, and `doctor` returned success with no findings.
- `npm pack --dry-run` passed with 67 files, all eight registered skills, and no
  `RULES.md`, `SKILL-PORTS.md`, or `schema-v1.md`.
- Live-source search found no dependency on the deleted schema file outside
  regression assertions and migration-history evidence.
- `git diff --check` passed.

## Plan variance

No material variance. Repository Maintainer selected `workflows/README.md` as
the consolidation target during Plan review, replacing the initially considered
extra workflow file before approval. Concurrent user-owned work, including the
`260715-2343-research-codebase-and-project` Plan, was preserved and indexed.

## Repeated friction

No repeated friction recorded yet.
