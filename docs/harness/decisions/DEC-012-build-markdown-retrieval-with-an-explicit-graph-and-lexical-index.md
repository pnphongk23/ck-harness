---
schema_version: 1
type: decision
id: DEC-012
title: Build Markdown retrieval with an explicit graph and lexical index
status: approved
created: 2026-07-19
approved: 2026-07-19
approved_by: Repository Maintainer
supersedes: "[[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]]"
relationships:
  specs: []
  decisions:
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
    - "[[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]]"
  plans:
    - "[[260719-1530-deliver-the-offline-markdown-relationship-graph/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
    - "[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]]"
  source_paths:
    - package.json
    - src/core/integrity.ts
    - src/fs/atomic-write.ts
    - src/fs/repository.ts
    - src/index/index.ts
    - src/adapters/index.ts
    - src/cli/index.ts
---

# DEC-012: Build Markdown retrieval with an explicit graph and lexical index

## Context

This Decision returns to Plan creation for
[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]]. Product Authority
clarified that the outcome is a fast and exact document-retrieval graph, not a
visual representation of document relationships, and selected the combined
explicit-graph plus lexical-index policy on 2026-07-19.

The current code has two incomplete halves. `src/core/integrity.ts` resolves
frontmatter relationship wikilinks into deterministic forward/backlink and
broken/ambiguous evidence, but only for canonical Harness artifacts. The
Graphify adapter in `src/adapters/index.ts` scans a fixed Markdown directory for
semantic extraction, may transmit content through a configured backend, and has
no exact lexical retrieval contract. `src/cli/index.ts` exposes graph
availability/build commands but no search or bounded graph traversal.

The replacement must account for every eligible Markdown file and supported
explicit link, avoid semantic edges, answer repeated queries without reparsing
Markdown, preserve offline privacy, and explain whether a result came from
lexical matching, exact identity, or explicitly requested graph expansion.

## Decision

Build one repository-owned, versioned retrieval artifact from a shared Markdown
document model. Reuse and generalize the existing Harness relationship resolver
for safe identity resolution, candidate ordering, ambiguity classification, and
repository containment. The generated Markdown index may consume that shared
model for its narrower canonical-artifact view, but it remains a separate
publication with its existing scope and authority.

Use `markdown-it` 14.3.0 as the CommonMark parser for ordinary Markdown links,
visible text, headings, code text, and token boundaries. Keep the existing
`yaml` dependency as the YAML/frontmatter parser. Implement only the missing
Obsidian wikilink recognition as a small repository-owned rule over eligible
plain-text tokens and YAML scalar/list values; do not regex-scan whole source
files, fenced code, inline code, or raw generated HTML for graph links.

Normalize each document ID to its repository-relative POSIX path beneath the
effective document root. Resolve an explicit relative path first, then one
unique pathless wikilink basename; strip heading and block fragments only after
retaining the raw occurrence. A unique source/target pair is one directed edge,
while every source occurrence remains evidence. Broken, unsafe, and ambiguous
occurrences never create an edge.

Use MiniSearch 7.2.0 as the in-process lexical engine. Index one record per graph
node over normalized path, title, headings, and authored body text. Use Unicode
NFC and lowercase term processing, no stemming or stop-word removal, and exact
non-prefix/non-fuzzy matching by default. Multi-term search uses AND semantics.
Rank direct matches with fixed field boosts, then apply normalized path as the
stable final tie-break. Preserve MiniSearch match/term evidence in the result;
do not use lexical score or shared terms as graph edges.

Publish a single `graph-out/retrieval-index.json` through the existing guarded
atomic-write boundary. The schema contains its schema version, source digest,
parser/index engine versions and options, sorted document records, sorted
logical edges with occurrences, sorted unresolved occurrences, and serialized
MiniSearch state. It contains no generation timestamp or layout state. One file
avoids mismatched graph/search publication and makes byte-stability testable.
`graph-out/` is allowlisted, disposable, ignored by discovery and watch
invalidation, and removed only through explicit cleanup. Historical
`graphify-out/` remains cleanup-only compatibility state.

Define these CLI boundaries:

- `ckh graph build` scans and atomically publishes a complete artifact without
  external permission or process spawning.
- `ckh graph check` validates schema/internal parity and recomputes the current
  eligible-source digest; this is the explicit freshness gate and may read
  Markdown.
- `ckh graph search QUERY [--limit N]` loads only the artifact, returns direct
  lexical matches, and includes `source_digest` in human/JSON results.
- `ckh graph related TARGET [--direction in|out|both] [--depth N]` loads only the
  artifact and performs deterministic breadth-first traversal over sorted
  adjacency, returning distance and path evidence with the same digest.

Search and related commands reject missing, malformed, incompatible, or
internally incomplete artifacts, but do not scan the working tree or implicitly
claim freshness. This is necessary because exact freshness proof requires
reading the current source, which would violate the fast-query boundary.

Remove Graphify process discovery, `--allow-external`, Cytoscape, generated HTML,
and browser behavior from the active graph path. `doctor` and `graph check` no
longer probe an optional executable. Existing strict CLI parsing reports the new
offline usage for obsolete flags.

## Alternatives

1. **Retain DEC-011's explicit graph and Cytoscape view, then add search.** This
   preserves the previous approved renderer but optimizes the wrong primary
   outcome, adds browser/package/security work, and still needs a lexical index.
   It increases delivery and verification without improving retrieval exactness.
2. **Keep Graphify as the graph and query engine.** This reuses the installed
   executable and semantic pipeline but cannot make explicit Markdown links the
   sole edge authority, requires a Python/process boundary, and can involve
   external content transmission. It conflicts with exact, offline, and
   explainable retrieval requirements.
3. **Build a custom Markdown scanner and inverted index.** This minimizes npm
   dependencies and gives complete serialization control, but recreates
   CommonMark tokenization, field ranking, term matching, index loading, and
   query behavior already maintained by focused libraries. The false-positive,
   false-negative, Unicode, and maintenance surface is materially larger.
4. **Shared Harness resolver plus markdown-it and MiniSearch — selected.** This
   reuses the current safe resolution behavior and two focused MIT-licensed
   libraries: one mature Markdown parser and one serializable offline search
   engine. It adds pinned dependencies and a versioned migration boundary, but
   keeps graph truth, search policy, privacy, and CLI evidence under repository
   control without building a search engine or visualization product.

## Consequences

- Retrieval correctness has two explicit invariants: graph nodes equal lexical
  records, and graph edges come only from supported authored links. Search rank
  is never relationship authority.
- MiniSearch serialization becomes part of the derived schema compatibility
  boundary. Dependency upgrades require schema/version review and golden-output
  migration evidence rather than silently loading old artifacts.
- `markdown-it` adds transitive parser dependencies; dependency license and
  packaged runtime verification are required. MiniSearch adds no runtime
  dependencies.
- Wikilink recognition remains a small owned extension because CommonMark does
  not define Obsidian syntax. Tests must prove it runs only in eligible text and
  YAML values, not code or raw HTML.
- A single JSON artifact simplifies atomic publication and internal parity but
  can be larger than separate files. Build and query tests must enforce an
  explicit maximum supported serialized size and clear failure rather than
  truncation or silent omission.
- Search is exact lexical retrieval, not semantic relevance. Documents using
  different vocabulary will not match unless reached through an explicitly
  requested authored relationship; this is accepted to preserve explainability
  and prohibit inferred edges.
- `graph check` is the freshness gate. Fast query commands identify their source
  snapshot but cannot prove it matches the live working tree without that check.
- The current Graphify adapter and executable warning disappear from active code,
  documentation, workflows, tests, and package behavior. Historical Decisions,
  Reports, and completed Plans remain unchanged.
- Visualization is outside FEAT-009. A future visualization may consume the
  versioned artifact without changing graph or lexical truth, but needs separate
  authority if it changes observable behavior or dependencies.

## Evidence

- [[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]] defines the
  approved explicit-graph plus lexical-retrieval behavior and distinguishes
  freshness checking from snapshot queries.
- [[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]]
  records the superseded visualization-centric choice and the resolver/privacy
  constraints retained here.
- `src/core/integrity.ts` currently owns deterministic candidate ordering,
  forward/backlink rendering, and broken/ambiguous relationship classification.
- `src/adapters/index.ts` currently owns the Graphify process boundary and
  external-transmission permission; `src/cli/index.ts` owns strict graph grammar.
- `src/fs/atomic-write.ts` supplies repository-contained guarded publication;
  `src/fs/repository.ts` owns the effective layout and disposable allowlist.
- `npm view markdown-it version license dependencies exports repository --json`
  on 2026-07-19 reported 14.3.0, MIT, ESM/CJS exports, and six focused runtime
  dependencies. Its official documentation states CommonMark support,
  configurable syntax rules, token parsing, and safe defaults.
- `npm view minisearch version license dependencies types exports repository
  --json` on 2026-07-19 reported 7.2.0, MIT, bundled types, ESM/CJS exports, and
  zero runtime dependencies. Its official API documents exact/prefix/fuzzy
  search, ranking, match evidence, and `toJSON`/`loadJSON` serialization.
- `package.json` requires Node.js 20 or newer and currently contains only
  `chokidar`, `yaml`, and `zod` as runtime dependencies.
- Repository Maintainer approved the explicit graph plus lexical index approach
  on 2026-07-19 after comparison with explicit-only traversal and semantic/LLM
  graph retrieval.

## Supersession

This Decision supersedes
[[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]].
DEC-011's shared deterministic resolver and offline privacy boundary carry
forward; its Cytoscape dependency, HTML publication, browser interaction, and
visualization acceptance do not. Through DEC-011, this Decision completes the
replacement boundary originally deferred by
[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]].
