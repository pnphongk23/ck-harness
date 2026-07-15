---
work_item: 1
title: "Initialize skills and consolidate schema guidance"
status: completed
priority: P1
effort: "2 hours"
dependencies: []
decision_dependencies: []
---

# Work Item 1: Initialize skills and consolidate schema guidance

## Kind

Feature and maintenance

## Tasks

- [x] Extend `initializeHarness` to copy every registered skill's `SKILL.md`
  into `.agents/skills/<name>/SKILL.md` without overwriting existing content.
- [x] Remove `RULES.md` and `schema-v1.md` from the init root allowlist; keep
  `SKILL-PORTS.md` outside the allowlist.
- [x] Add an artifact contract section to `docs/harness/workflows/README.md`
  containing every durable contract currently unique to `schema-v1.md`, then
  remove `schema-v1.md`.
- [x] Update doctor, deterministic index links, package contents, historical
  source relationship, and docs/tests that refer to the deleted schema file.
- [x] Add init regression coverage for exact skill creation, idempotency,
  preservation, and absence of internal documents.
- [x] Run focused and full verification, inspect package contents, and review
  the final diff for unrelated or overwritten user changes.

## Scope and affected files

- Modify: `src/core/lifecycle.ts`, `src/core/integrity.ts`, `package.json`,
  `tests/cli-lifecycle.test.ts`, `tests/integrity.test.ts`, and
  `tests/workflows.test.ts` as required by exact assertions.
- Modify: `docs/harness/workflows/README.md` with the shared artifact contract;
  do not create another workflow file.
- Remove: `docs/harness/schema-v1.md`.
- Update the one canonical source relationship that points at the removed file
  and rebuild `docs/harness/index.md` through repository tooling.
- Do not modify skill contents or user-authored existing initialized files.

## Success criteria

- [x] Fresh `harness init` creates every registered
  `.agents/skills/<name>/SKILL.md` with package-source bytes.
- [x] A repeated init makes no file changes; existing skill and Harness content
  is preserved byte-for-byte.
- [x] Fresh init does not create `docs/harness/RULES.md`,
  `docs/harness/schema-v1.md`, or `docs/harness/SKILL-PORTS.md`.
- [x] The workflow artifact contract preserves all schema-v1 rules for artifact
  paths, filenames, frontmatter, relationships, IDs, statuses, approvals,
  Plans, Work Items, Plan-local design, and Feature body structure.
- [x] Doctor and index treat the workflow artifact contract as canonical and no
  runtime/package/test reference requires `schema-v1.md`.
- [x] Existing command aliases and unrelated dirty worktree changes remain intact.
- [x] Focused tests, `npm run verify`, Harness validation/index/doctor,
  `npm pack --dry-run`, and `git diff --check` pass.

## Risks

- Recursive copying could accidentally publish internal support material.
- Removing schema prose before migrating every clause could weaken user guidance.
- Updating `package.json` could overwrite the user's existing uncommitted aliases.
- A stale generated index could hide the moved canonical source.

## Required evidence

- Compare sorted registered skill names with sorted initialized skill paths and
  compare every source/target file byte-for-byte.
- Snapshot a workspace before repeated init and prove the snapshot is unchanged.
- Assert all three internal document paths are absent after fresh init.
- Search the repository for live `schema-v1` references after migration and
  classify any historical mention that remains.
- Run the focused compiled CLI lifecycle, integrity, workflow, and skill tests.
- Run `npm run verify`, CLI `validate --all`, `index check`, `doctor`,
  `npm pack --dry-run`, and `git diff --check`.

## Evidence

- `npm run build` plus focused CLI lifecycle, integrity, workflow, and skill
  suites passed 26 tests, 0 failed.
- `npm run verify` passed TypeScript checks and 76 tests, 0 failed.
- The init regression compared all seven newly copied skill files byte-for-byte,
  preserved a user-owned eighth skill, proved repeated init snapshot equality,
  and asserted all three internal document paths absent.
- `harness validate --all`, `index check`, and `doctor` returned success with no findings.
- `npm pack --dry-run` passed with 67 allowlisted files. It contained all eight
  registered skills and no `RULES.md`, `SKILL-PORTS.md`, or `schema-v1.md`.
- Live-source search found no `schema-v1` dependency outside explicit regression
  assertions and this Plan's migration history.
- Diff review preserved the pre-existing command aliases, skills, workflow
  edits, and concurrent `260715-2343-research-codebase-and-project` Plan.
- `git diff --check` passed.
