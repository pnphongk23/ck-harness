---
work_item: 4
title: Graph CLI migration and canonical guidance
status: completed
priority: P1
effort: 2-3 days
dependencies:
  - 3
decision_dependencies:
  - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
---

# Work Item 4: Graph CLI migration and canonical guidance

**Kind:** migration

## Tasks

1. Re-read the completed predecessor Plan delta before editing shared workflow
   docs/tests; preserve its workflow-automation assertions and apply only the
   retrieval-graph changes authorized here.
2. Replace Graphify imports/child-process injection with built-in graph
   build/check/search/related command handlers. Preserve strict `parseArgs`,
   workspace resolution, human/JSON envelopes, and existing error exit classes.
3. Implement exact grammar and validation from `design.md`: remove
   `--allow-external`; validate search limit and related direction/depth; reject
   old/unknown/extra arguments as usage errors.
4. Make `graph build` call complete artifact publication, `graph check` call
   schema/internal/freshness validation, and query commands load only the
   artifact. Ensure missing/stale graph evidence never invalidates canonical
   `index check` or unrelated `doctor` prerequisites.
5. Remove `src/adapters/index.ts` and Graphify executable discovery/warnings from
   active runtime. Remove Graphify dependency injection types from `CliIo` and
   update public exports/package contents accordingly.
6. Replace Graphify-centric graph tests with default/custom-layout integration
   coverage for every human/JSON success, usage, unavailable, stale, malformed,
   ambiguous, bounded-query, and build failure outcome.
7. Update current canonical guidance in README, the Plan workflow document,
   Self-Improve workflow, and SKILL-PORTS to describe built-in exact retrieval,
   freshness checks, snapshot queries, offline privacy, and disposable output.
   Preserve the predecessor's lifecycle/approval/CLI automation contracts and
   preserve historical Decisions, completed Plans, and Reports.
8. Update workflow/document tests for the changed guidance without weakening
   unrelated lifecycle, approval, CLI automation, manual fallback, or recovery
   assertions. The Plan workflow tests must explicitly cover replacement of
   Graphify grounding with built-in graph-artifact grounding.

## Scope and affected files

- `src/cli/index.ts`
- `src/cli/bin.ts` if help/version output needs command listing changes
- `src/core/integrity.ts`
- `src/adapters/index.ts` (remove)
- `tests/graph-adapter.test.ts` (replace or rename to graph CLI integration)
- `tests/integrity.test.ts`
- `tests/cli-lifecycle.test.ts`
- `docs/harness/README.md`
- `docs/harness/SKILL-PORTS.md`
- `docs/harness/workflows/plan.md`
- `docs/harness/workflows/self-improve.md`
- `docs/harness/workflows/README.md` if the lifecycle diagram or planning
  preconditions still names Graphify as the active grounding path
- `tests/workflows.test.ts`
- `tests/skills.test.ts` only if current routing/help assertions mention Graphify
- `package.json` package allowlist only if the new compiled graph boundary is not
  already included through `dist/src`

No Feature rewrite, historical delivery rewrite, visualization, server, editor
integration, watcher-triggered build, or compatibility no-op for
`--allow-external` belongs to this Work Item.

## Success criteria

- [x] All four graph commands have stable human/JSON success and error envelopes
  and strict options/positionals; obsolete `--allow-external` is a usage error.
- [x] Build/check read source as designed; search/related load only the artifact
  and always return `source_digest` without claiming live freshness.
- [x] A stale graph check is graph-specific non-success evidence while index
  validation/check and other required doctor checks remain independent.
- [x] No active runtime imports `child_process`, searches PATH for Graphify,
  produces HTML, or references Cytoscape/Graphify as the current graph engine.
- [x] Default/custom-layout, missing/malformed/stale artifact, target ambiguity,
  numeric bounds, cleanup, and package-boundary CLI fixtures pass.
- [x] Canonical current guidance consistently describes retrieval rather than
  visualization; the Plan workflow specifically defines built-in graph
  grounding and artifact freshness boundaries; every non-graph workflow
  gate/assertion is retained.
- [x] Historical Decisions, completed Plans, and Reports remain byte-unchanged
  except the already authorized DEC-011/DEC-012 supersession history.

## Risks

- Shared workflow tests are already being changed by the predecessor Plan. Start
  from its completed green state and retain its exact automation contract.
- `doctor` currently treats Graphify absence as warning success. Removing that
  warning changes snapshots/output; cover human/JSON ordering and confirm no
  required check is dropped.
- Deleting adapter injection can affect tests that use fake processes. Replace
  them with filesystem/artifact injection at the graph core boundary rather than
  keeping a dead compatibility layer.
- Documentation search can find legitimate Graphify history. Restrict no-stale-
  wording assertions to active runtime/guidance, not approved historical evidence.

## Required evidence

- `graph-cli.test.ts`: built-in build/check/search/related paths, stale evidence,
  and obsolete `--allow-external` rejection passed.
- Active runtime no longer imports the Graphify adapter or child-process boundary;
  current README/workflow/SKILL-PORTS guidance describes the local retrieval
  artifact and freshness boundary.
- `npm run verify`: CLI, integrity, cleanup, watcher, workflow, and graph suites
  passed; `git diff --check` passed.
