---
work_item: 3
title: Deterministic retrieval queries
status: completed
priority: P1
effort: 2-3 days
dependencies:
  - 2
decision_dependencies:
  - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
---

# Work Item 3: Deterministic retrieval queries

**Kind:** story

## Tasks

1. Implement a graph query service that accepts already validated artifact
   bytes/models and has no repository-root, Markdown reader, watcher, process,
   network, Git, or publication dependency. [x]
2. Implement direct lexical search with whitespace validation, Unicode NFC,
   MiniSearch AND semantics, fixed v1 boosts/options, finite score validation,
   stable score/path ordering, default limit 20, accepted limit 1..100, and
   source-digest/query-term/matched-term/matched-field evidence. [x]
3. Resolve related-query targets by exact normalized path first and one unique
   basename second. Return broken or sorted ambiguous evidence without guessing. [x]
4. Build sorted inbound/outbound adjacency and implement deterministic BFS for
   direction `in|out|both`, default depth 1, accepted depth 1..5, shortest
   distance, and lexicographically smallest shortest-path evidence. [x]
5. Keep the root identity and each relationship result labeled separately;
   search results never contain relationship-only documents and related results
   never contain lexical-similarity-only documents. [x]
6. Add unit/property-style tests for ranking ties, multi-term AND, accents and
   Unicode normalization, invalid scores/options/limits, exact/ambiguous targets,
   cycles, self-edges, diamond paths, direction/depth, deterministic ordering,
   and source-digest propagation. [x]
7. Add the fixed temporary 10,000-document/100,000-edge performance harness,
   warm-load separation, at least 100 measurements per query family, p50/p95
   reporting, 250 ms p95 assertions, and a filesystem-read spy proving zero
   source Markdown reads during queries. [x]

## Scope and affected files

- `src/graph/query.ts` (new)
- `src/graph/index.ts`
- `tests/graph-query.test.ts` (new)
- `tests/graph-performance.test.ts` (new)

No CLI option parsing, source scanning, publication, visualization, snippets,
fuzzy/prefix/semantic search, or auto-expansion belongs to this Work Item.

## Success criteria

- [x] A multi-term query returns only direct documents matching every normalized
  term, bounded by the requested/default limit and ordered by score then path.
- [x] Every lexical result has `reason: lexical`, stable identity/title, finite
  score, matched terms/fields, and the artifact source digest; no linked-only
  document appears.
- [x] Related traversal returns the exact requested directional neighborhood to
  the bounded depth, with one result per node, shortest distance, deterministic
  explicit path, and no lexical-only document.
- [x] Broken and ambiguous target identities return evidence and no traversal.
- [x] Cycles/self-edges cannot create duplicate results or unbounded work.
- [x] Equivalent artifact/query/options produce deeply equal result objects and
  ordering across repeated runs and platform-path fixtures.
- [x] The 10k/100k benchmark records search and depth-1 traversal p95 at or below
  250 ms after load and observes zero source Markdown reads during queries.

## Risks

- MiniSearch returns floating scores and match objects whose iteration order is
  not the public result contract. Normalize evidence and apply an explicit path
  tie-break before returning it.
- `both` traversal can discover one node through inbound and outbound shortest
  paths. Choose the lexicographically smallest full ID sequence and label the
  actual traversed directions instead of duplicating the document.
- Performance tests can become noisy. Separate load/warm-up, use a fixed corpus
  and sample count, report p50/p95, and retain the generous approved 250 ms
  budget rather than timing individual calls.

## Required evidence

- `node --test dist/tests/graph-query.test.js`: lexical truth table, AND/no-fuzzy/
  no-prefix behavior, bounded traversal, cycles, unresolved targets, and
  deterministic ordering passed.
- Fixed benchmark: 10,000 documents, 100,000 edges, 100 search and 100 related
  samples; both p95 assertions were <=250ms after artifact construction.
- Query service receives only a validated artifact and performs no repository or
  Markdown reads.
- `npm run verify` and `git diff --check`: passed.
