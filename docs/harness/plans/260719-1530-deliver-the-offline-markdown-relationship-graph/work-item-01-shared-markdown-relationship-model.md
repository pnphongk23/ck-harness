---
work_item: 1
title: Shared Markdown document graph model
status: completed
priority: P1
effort: 3-4 days
dependencies: []
decision_dependencies:
  - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
---

# Work Item 1: Shared Markdown document graph model

**Kind:** technical

## Tasks

1. Start only after the predecessor workflow-automation Plan completes and
   `npm run verify` restores a green baseline; record the exact predecessor
   status/evidence without modifying its completed artifacts. [x]
2. Add exact runtime dependencies `markdown-it@14.3.0` and
   `minisearch@7.2.0`, exact development dependency
   `@types/markdown-it@14.1.2`, and update the npm lockfile through normal npm
   tooling. Verify license, exports, transitive dependency, Node 20, ESM, and
   packed-runtime compatibility. [x]
3. Add the typed document, occurrence, edge, unresolved, resolution, and graph
   model under `src/graph/`; keep rendering, CLI, publication, and query behavior
   outside this Work Item. [x]
4. Implement deterministic eligible Markdown discovery from the effective
   Harness root, including generated/disposable exclusions, normalized IDs,
   containment, symlink rejection, ordered double-read snapshot verification,
   per-document digests, and the v1 source digest. [x]
5. Parse Markdown with markdown-it tokens and YAML with the existing parser.
   Extract title/headings/body search fields, standard local `.md` links, and
   wikilinks only from eligible prose/YAML contexts. Index code text but never
   treat code/raw-HTML examples as graph links. [x]
6. Extract reusable resolution primitives from `src/core/integrity.ts` without
   changing the existing generated index's catalog or accepted relationship
   answers. Resolve exact safe paths before unique pathless basenames, retain
   raw fragments/aliases, deduplicate logical edges, and partition every
   occurrence into exactly one resolved edge or unresolved entry. [x]
7. Add focused fixtures for Markdown/YAML contexts, aliases/fragments,
   URI/Unicode/separator normalization, duplicate occurrences, pathless
   ambiguity, unsafe/symlink targets, shuffled enumeration, configured roots,
   and second-read divergence. [x]

## Scope and affected files

- `package.json`
- `package-lock.json`
- `src/graph/markdown.ts` (new)
- `src/graph/model.ts` (new)
- `src/graph/index.ts` (new export boundary)
- `src/core/integrity.ts`
- `src/core/index.ts`
- `src/core/schemas/frontmatter.ts` only if a schema-neutral frontmatter split is
  required; preserve current Harness artifact parsing behavior
- `tests/graph-model.test.ts` (new)
- `tests/index-resolution.test.ts`
- `tests/repository-paths.test.ts`

No CLI command, graph artifact, search query, canonical workflow, or historical
artifact changes belong to this Work Item.

## Success criteria

- [x] Every eligible Markdown fixture owns exactly one normalized node and one
  ordered content/search record; excluded output and symlink paths own none.
- [x] Standard links and supported wikilinks in prose/YAML produce the expected
  occurrences; the same text inside code/raw HTML produces no edge occurrence.
- [x] One source/target pair owns one logical edge while every duplicate authored
  occurrence remains present and ordered.
- [x] Broken, unsafe, and ambiguous occurrences name source/raw target/candidates
  and never create edges.
- [x] The union of resolved and unresolved occurrence ordinals equals the exact
  extracted occurrence set with no duplicate or missing ordinal.
- [x] Two shuffled discovery orders and Windows/POSIX separator fixtures produce
  byte-equivalent logical models and source digests.
- [x] Existing generated-index resolution tests remain unchanged in observable
  result, proving the refactor did not broaden canonical index scope.
- [x] Dependency audit confirms exact versions, MIT licenses, Node 20 ESM
  loading, and no Graphify/Cytoscape/LLM/embedding dependency.

## Risks

- markdown-it inline tokens do not give a line/column for every child; use stable
  source-order ordinals, which FEAT-009 requires, instead of inventing unreliable
  positions.
- A regex over whole Markdown would create false links from examples; tests must
  bind wikilink scanning to eligible token/YAML contexts.
- Refactoring private resolver logic can change the existing index. Golden
  forward/backlink/unresolved fixtures must remain identical.
- Configured roots may be broader than canonical collections. Discovery uses the
  effective root but excludes only explicitly owned generated/disposable paths;
  it must not fall back to collection-only scanning.

## Required evidence

- `npm run verify`: TypeScript check and 117/117 tests passed.
- Focused graph/index/path suite: 26/26 tests passed.
- `npm ls markdown-it minisearch --depth=0`: exact `markdown-it@14.3.0` and `minisearch@7.2.0`.
- Graph fixtures cover deterministic discovery, source digests, symlink rejection,
  code-fence exclusion, duplicate occurrences, broken/ambiguous targets, and
  repository paths.
- `git diff --check`: passed.
