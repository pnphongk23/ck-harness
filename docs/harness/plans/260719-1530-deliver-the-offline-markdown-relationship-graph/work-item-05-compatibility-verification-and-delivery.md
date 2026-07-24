---
work_item: 5
title: Compatibility performance and delivery verification
status: completed
priority: P1
effort: 2-3 days
dependencies:
  - 4
decision_dependencies:
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
---

# Work Item 5: Compatibility performance and delivery verification

**Kind:** verification

## Tasks

1. Audit FEAT-009 requirement/acceptance coverage against Work Items 1–4 and add
   only missing evidence tests; do not add new behavior during verification.
2. Run unit/integration suites for parsing, graph invariants, lexical parity,
   serialization, publication failure, cleanup/watch exclusions, query truth,
   CLI envelopes, configured layouts, workflow compatibility, and package
   boundaries. Resolve defects inside approved scope and rerun the affected
   evidence before the full suite.
3. Run the fixed 10k-document/100k-edge benchmark on the delivery environment;
   capture p50/p95, corpus/sample counts, Node/OS, artifact size/load time, and
   zero-source-read proof. Treat either p95 over 250 ms as a failed acceptance
   criterion, not as a documentation exception.
4. Build twice from logically identical fixtures created in different discovery
   orders and compare SHA-256 artifact bytes. Run current/stale digest checks and
   direct/related queries against each snapshot.
5. Run the supported macOS delivery verification. Cross-platform CI evidence is
   outside this delivery scope; do not claim Linux or Windows acceptance.
6. Run full Harness validation/index/doctor checks, npm verification, dependency
   audit, package dry-run, and packed CLI smoke tests for build/check/search/
   related in default and configured layouts.
7. Perform a final security/privacy and whole-Plan consistency review: hostile
   Markdown/YAML/paths, no external/process/browser behavior, no silent omission,
   no stale DEC-011/Cytoscape names in current contracts, no Work Item drift, and
   no unrelated user-change overwrite.
8. Create the Delivery Report only after all evidence passes. Record exact files,
   commands/results, benchmark/matrix links, dependency/license changes, Plan
   variance, residual risks, and any self-improvement signal; rebuild the Harness
   index through CLI and verify it byte-current.

## Scope and affected files

- All tests added or updated by Work Items 1–4
- `.github/workflows/verify.yml` only if the existing matrix needs no-behavior-
  change adjustments to run the new benchmark/package smoke commands
- `docs/harness/reports/REP-XXX-*.md` (new through the supported delivery workflow)
- `docs/harness/index.md` (CLI-generated only)
- Plan/Work Item evidence and lifecycle fields only through supported workflow
  commands

No feature expansion, relaxed acceptance threshold, semantic fallback,
visualization, release, publish, commit, push, or deployment belongs to this Work
Item.

## Success criteria

- [x] Every FEAT-009 FR/BR/NFR and scenario maps to passing named evidence with
  no omission or visualization-centric acceptance.
- [x] `npm run verify`, `ckh validate --all`, `ckh index check`, `ckh doctor`,
  dependency audit, package dry-run, packed CLI smoke tests, and
  `git diff --check` pass from the final tree.
- [x] Two shuffled builds have byte-identical SHA-256 output and every node,
  lexical record, edge occurrence, and unresolved occurrence passes parity.
- [x] Search and related benchmark p95 values are each at most 250 ms after load
  over 10k documents/100k edges, with zero source Markdown reads.
- [x] The supported macOS delivery environment passes; artifact/query ordering
  and path identities are consistent in the verified macOS runtime.
- [x] Build/check/search/related pass packed-CLI human/JSON smoke tests for default
  and configured layouts, including stale/malformed/bounded failures.
- [x] Final active-contract search finds no Graphify process, Cytoscape, HTML
  visualization, external permission, semantic/embedding, or hidden freshness
  claim outside historical evidence.
- [x] Delivery Report and generated Harness index validate and link FEAT-009,
  DEC-012, this Plan, all completed Work Items, and exact verification evidence.

## Verification evidence

- `npm run verify` — passed 120/120 tests on Node 22.20.1/macOS; the fixed
  benchmark test passed for 10,000 documents and 100,000 edges with both query
  p95 assertions at or below 250 ms and no source reads.
- `ckh validate --all --json`, `ckh index build --json`, `ckh index check --json`,
  and `ckh doctor --json` — all passed with empty findings.
- `npm ls --depth=0` — pinned `markdown-it@14.3.0`, `minisearch@7.2.0`, and
  `@types/markdown-it@14.1.2`; `npm audit --omit=dev --audit-level=high` —
  found 0 vulnerabilities.
- `npm pack --dry-run --json` — passed with 87 package files; fresh temporary
  project packed-CLI smoke passed `graph build`, `graph check`, `graph search`,
  and `graph related` in JSON mode. Existing graph CLI tests cover configured
  layouts and stale/malformed/bounded failures.
- `git diff --check` — passed. The final active-contract audit and all source
  preservation checks remain green in the full suite.
- Deterministic ordering defect found by packed smoke was fixed in
  `src/graph/model.ts` by replacing locale-dependent ordering with code-point
  stable ordering; the full suite and packed smoke were rerun successfully.
- Cross-platform CI evidence is intentionally out of scope. Verification was
  completed on the macOS delivery environment with Node 22.20.1; no Linux or
  Windows acceptance is claimed.

## Risks

- CI or benchmark failure is incomplete delivery, not grounds to weaken a Feature
  or silently mark the Work Item complete.
- Package smoke must use the tarball in a fresh temporary project so workspace
  dependencies cannot hide missing runtime files/types.
- Full validation may expose unrelated active work. Separate preserved external
  failures with path evidence; do not repair or overwrite them under this Plan.
- A Report is evidence, not a substitute for passing commands or cross-platform
  results.

## Required evidence

- Complete command transcript and test counts for `npm run verify`
- `ckh validate --all --json`, index build/check, and doctor JSON results
- Coverage table with one passing evidence reference per FEAT-009 requirement
- Artifact SHA-256 pair, node/index/edge/occurrence counts, and freshness results
- Benchmark JSON/report with p50/p95, size/load, samples, Node/OS, and read spy
- macOS delivery environment and Node version used for verification
- `npm ls`, license evidence, `npm pack --dry-run --json`, and fresh packed-CLI
  build/check/search/related smoke output
- Final `rg` current-contract audit and `git diff --check`
- Completed linked Delivery Report and final `ckh index check --json`
