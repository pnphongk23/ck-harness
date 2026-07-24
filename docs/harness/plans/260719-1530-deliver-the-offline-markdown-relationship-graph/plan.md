---
title: Deliver the exact Markdown retrieval graph
description: Build one deterministic explicit document graph and serialized lexical index for fast, explainable, offline Markdown retrieval.
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-23
priority: P1
effort: 2-3 weeks
branch: codex/deliver-markdown-retrieval-graph
tags:
  - graph
  - markdown
  - retrieval
  - search
  - cli
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
  plans:
    - "[[260716-2335-automate-harness-workflow-operations/plan|Plan]]"
  reports:
    - "[[REP-011-deliver-the-offline-markdown-retrieval-graph|REP-011]]"
  rules: []
  features:
    - "[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]]"
  source_paths:
    - docs/harness/plans/260719-1530-deliver-the-offline-markdown-relationship-graph/design.md
    - docs/harness/features/FEAT-009-build-an-exact-markdown-document-graph.md
    - docs/harness/decisions/DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index.md
    - docs/harness/README.md
    - docs/harness/SKILL-PORTS.md
    - docs/harness/workflows/plan.md
    - docs/harness/workflows/self-improve.md
    - package.json
    - package-lock.json
    - src/core/integrity.ts
    - src/core/schemas/frontmatter.ts
    - src/fs/atomic-write.ts
    - src/fs/repository.ts
    - src/index/index.ts
    - src/watcher/index.ts
    - src/adapters/index.ts
    - src/cli/index.ts
    - tests/graph-adapter.test.ts
    - tests/index-resolution.test.ts
    - tests/index-watch.test.ts
    - tests/integrity.test.ts
    - tests/repository-paths.test.ts
    - tests/workflows.test.ts
    - .github/workflows/verify.yml
created: 2026-07-19T15:30:00+07:00
createdBy: Codex
source: Approved FEAT-009 and DEC-012 after Product Authority selected explicit graph plus lexical retrieval
---

# Deliver the exact Markdown retrieval graph

## Overview

Replace the Graphify-oriented visualization adapter with one built-in,
repository-local retrieval boundary. A shared document model will parse all
eligible Markdown under the effective Harness root, produce exact explicit-link
evidence, serialize one MiniSearch index over the same node set, and publish one
versioned JSON snapshot. Queries load only that artifact: `graph search` returns
direct lexical matches, while `graph related` performs explicit bounded graph
traversal. `graph check` alone reads current Markdown to prove freshness.

The implementation is governed by
[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]] and
[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]].
FEAT-004 and FEAT-006 are related compatibility authority: canonical Markdown
navigation, index behavior, configured layouts, and optional derived-state
failure must remain intact. The Plan-local [design](./design.md) fixes the
artifact, parsing, resolution, query, limit, and publication details needed for
deterministic execution.

The predecessor
[[260716-2335-automate-harness-workflow-operations/plan|workflow automation Plan]]
is now complete. This Plan therefore owns the follow-up update to the current
workflow guidance and its focused assertions: `docs/harness/workflows/plan.md`
must describe built-in graph grounding and retrieval-artifact verification, and
the related workflow/document tests must retain all existing lifecycle gates
while replacing stale Graphify assumptions. No graph implementation is
required by the predecessor.

## Work Items

| Work Item | Name | Status | Depends on |
| --- | --- | --- | --- |
| 1 | [Shared Markdown document graph model](./work-item-01-shared-markdown-relationship-model.md) | Pending | Predecessor Plan completed |
| 2 | [Versioned graph and lexical index](./work-item-02-versioned-graph-data-and-safe-publication.md) | Pending | 1 |
| 3 | [Deterministic retrieval queries](./work-item-03-deterministic-retrieval-queries.md) | Pending | 2 |
| 4 | [Graph CLI migration and canonical guidance](./work-item-04-graph-cli-migration-and-packaging.md) | Pending | 3 |
| 5 | [Compatibility, performance, and delivery verification](./work-item-05-compatibility-verification-and-delivery.md) | Pending | 4 |

## Coverage

| FEAT-009 requirement or acceptance boundary | Delivering Work Item |
| --- | --- |
| FR-001 complete Markdown scope; BR-004 no silent loss; configured/default layouts | 1, 2, 5 |
| FR-002 supported explicit links; FR-003 exact edge/occurrence accounting | 1, 5 |
| FR-004 one lexical record per graph node | 1, 2, 5 |
| FR-005 explicit complete build and one versioned source snapshot | 2, 4, 5 |
| FR-006 direct AND lexical retrieval, limits, rank, and match evidence | 2, 3, 4, 5 |
| FR-007 exact identity and bounded directional relationship retrieval | 1, 3, 4, 5 |
| FR-008 snapshot identity and explicit freshness checking | 2, 3, 4, 5 |
| FR-009 stable human/JSON results and deterministic ordering | 3, 4, 5 |
| BR-001 Markdown authority; BR-005 optional disposable capability | 2, 4, 5 |
| BR-002 no inferred edges; BR-003 separated retrieval reasons | 1, 2, 3, 5 |
| NFR-001 offline privacy; NFR-004 path/symlink containment | 1, 2, 4, 5 |
| NFR-002 byte stability and macOS portability | 1, 2, 3, 5 |
| NFR-003 10k-document/100k-edge p95 query budget without source reads | 3, 5 |
| Build, direct-search, related-context, failure/stale-snapshot scenarios | 2, 3, 4, 5 |
| Visualization, semantic inference, embeddings, fuzzy/stemmed search, watcher-triggered rebuild, and source editing remain excluded | 1, 3, 4, 5 |

## Verification

### Verification ledger

| Execution-affecting claim | Status | Evidence |
| --- | --- | --- |
| Node.js 20+, ESM, strict TypeScript, and package/runtime boundaries are current | Verified | `package.json`, `tsconfig.json`, and `.github/workflows/verify.yml`. |
| Current relationship resolution already sorts candidates and distinguishes resolved, broken, and ambiguous links | Verified | `relationshipCandidates()`, `resolveRelationship()`, and `targetsFor()` in `src/core/integrity.ts`; `tests/index-resolution.test.ts`. |
| Current canonical scanning cannot parse arbitrary Markdown because `parseMarkdownDocument()` requires Harness frontmatter/schema | Verified | `src/core/schemas/frontmatter.ts` and `scanHarness()` in `src/core/integrity.ts`. |
| Current graph behavior is a fixed Graphify child-process adapter requiring `--allow-external` | Verified | `src/adapters/index.ts`, graph command specs in `src/cli/index.ts`, and `tests/graph-adapter.test.ts`. |
| Existing publication can stage, fsync, compare, atomically rename, and roll back repository-contained text mutations under one lock | Verified | `applyMutation()` and `withRepositoryLock()` in `src/fs/atomic-write.ts`; `tests/mutations.test.ts`. |
| Disposable cleanup relies on positional allowlist slicing, so adding `graph-out/` requires coordinated repository/cleanup tests | Verified | `repositoryPaths()` in `src/fs/repository.ts`, `cleanHarness()` in `src/core/lifecycle.ts`, and `tests/repository-paths.test.ts`. |
| Watch self-invalidation currently ignores only `graphify-out/`, the generated index, and temporary files | Verified | `ignoredPath()` in `src/watcher/index.ts` and `tests/index-watch.test.ts`. |
| `doctor`, Plan/Self-Improve workflows, README, skill provenance, and tests still describe optional Graphify visualization | Verified | `diagnoseHarness()` in `src/core/integrity.ts`, `docs/harness/{README.md,SKILL-PORTS.md,workflows/plan.md,workflows/self-improve.md}`, and `tests/{integrity,workflows}.test.ts`. |
| MiniSearch 7.2.0 is MIT, ESM/CJS, typed, zero-dependency, and supports ranking plus serialized `toJSON/loadJSON` state | Verified | `npm view minisearch ... --json` and official MiniSearch API inspected 2026-07-19. |
| markdown-it 14.3.0 is MIT, ESM/CJS, CommonMark-oriented, configurable, token-based, and has six focused runtime dependencies | Verified | `npm view markdown-it ... --json` and official markdown-it documentation inspected 2026-07-19. |
| Existing CI executes `npm run verify` and package smoke checks on macOS with Node 20/22/24 | Verified | `.github/workflows/verify.yml`. |
| The predecessor workflow-automation Plan is approved and completed, including its workflow assertions | Verified | `ckh workflow status 260716-2335-automate-harness-workflow-operations`; `tests/workflows.test.ts`. |
| Current full verification is green before graph work | Verified | `npm run verify` on 2026-07-23 passed TypeScript checks and all 113 tests. |

Verification totals: 13 Verified, 0 Failed, 0 Unresolved. Plan approval remains
pending only because Repository Maintainer approval has not yet been recorded.

### Dependencies and risks

- **Authority:** FEAT-009 is approved and DEC-012 is approved. DEC-011 is
  superseded; no Work Item may reintroduce Cytoscape, HTML graph output, Graphify,
  semantic extraction, or external transmission.
- **Workflow documentation ownership:** The predecessor workflow-automation
  Plan is complete. Work Item 4 may now update `docs/harness/workflows/plan.md`
  and related current guidance, but must preserve the predecessor's lifecycle,
  approval, CLI automation, manual fallback, and recovery contracts.
- **Parser correctness:** Standard Markdown links must come from markdown-it
  tokens. The owned wikilink rule runs only on eligible prose/YAML values so
  examples in code fences, inline code, and raw HTML do not become edges.
- **Snapshot correctness:** A build performs two consistent ordered source reads
  before publication. The artifact identifies those exact bytes; only `graph
  check` compares the digest to the live tree. Query commands never imply
  freshness.
- **Artifact safety:** Reject artifacts over 128 MiB before JSON parsing or
  publication. Schema, engine version, node/index parity, edge references, sorted
  uniqueness, limits, and source digest must validate before use.
- **Dependency compatibility:** Pin markdown-it 14.3.0, `@types/markdown-it`
  14.1.2, and MiniSearch 7.2.0. Any upgrade that changes parse or serialization
  output requires schema/golden migration evidence.
- **Performance:** The p95 budget excludes one-time artifact load but includes
  query normalization, MiniSearch lookup or breadth-first traversal, stable sort,
  evidence shaping, and limit enforcement. Benchmark data is generated in a
  temporary directory and never committed as canonical state.
- **Preserved state:** No Work Item edits authored Markdown during build/query,
  follows symlinks, invokes Git/network/watchers, or deletes legacy output except
  through existing explicit cleanup.

### Adversarial review

- **Security/privacy:** Reject schemes, absolute/escaping paths, symlink files and
  directories, oversized artifacts, prototype-bearing malformed JSON, and hostile
  Markdown/YAML values. Never render or execute Markdown-derived HTML/JavaScript.
- **Silent omission:** Assert equality among discovered paths, graph node IDs,
  MiniSearch document count/IDs, source digest entries, and queryable identities;
  any mismatch fails before publication.
- **Failure mode:** Inject parse, second-read divergence, lock contention, staged
  write, rename, malformed artifact, incompatible engine/schema, and stale digest
  failures; the prior complete artifact and canonical files remain byte-identical.
- **Scope complexity:** Keep one JSON artifact, two query commands, one parser
  extension, and no UI/server/database/incremental watcher. Do not add semantic
  search, snippets, phrase language, fuzzy/prefix flags, auto-rebuild, or editor
  integration.
- **Compatibility:** Preserve strict human/JSON envelopes, configured layouts,
  cleanup preview/confirmation, index/watch independence, package allowlist, and
  the existing macOS × Node 20/22/24 CI matrix.

### Required final evidence

- `npm run verify`
- `ckh validate --all --json`
- `ckh index build --json && ckh index check --json`
- `ckh doctor --json`
- Graph build/check/search/related human and JSON integration matrix for default
  and configured layouts, including stale/malformed/oversized cases
- Fixed 10,000-document/100,000-edge benchmark report with p50/p95 and assertion
  that query paths perform zero source reads
- Two shuffled-discovery builds with byte-identical artifact hashes
- `npm pack --dry-run --json` plus packed CLI build/check/search/related smoke test
- macOS delivery-environment verification result; Linux and Windows are out of scope
- `git diff --check`

Whole-Plan consistency sweep: complete. FEAT-009 terms, DEC-012 technology,
snapshot freshness boundary, artifact name/schema, CLI commands/options, Work
Item dependencies, coverage, risks, and evidence agree across `plan.md`,
`design.md`, and all five Work Items. Workflow-document ownership and test
preservation are explicit; zero internal contradictions remain. Mechanical
validation and the full verification command both pass.
