# Markdown retrieval graph design

## Ownership and boundaries

This design belongs only to
[Deliver the exact Markdown retrieval graph](./plan.md). FEAT-009 owns observable
behavior and DEC-012 owns the durable parser/search/artifact choice. This file
defines implementation contracts needed by the five Work Items; it is not a new
source of product authority.

The boundary has four layers:

1. `src/graph/markdown.ts` discovers and parses eligible Markdown into normalized
   document records and raw link occurrences.
2. `src/graph/model.ts` resolves occurrences into exact nodes, unique directed
   edges, and unresolved evidence through shared resolver primitives.
3. `src/graph/artifact.ts` builds, validates, serializes, loads, and freshness-
   checks the single retrieval artifact.
4. `src/graph/query.ts` performs direct lexical search and bounded explicit graph
   traversal without reading Markdown.

`src/cli/index.ts` is the only public command adapter. Graph code does not import
the CLI, watcher, child-process adapter, Git, network, browser, or agent runtime.
The existing Markdown index retains its own publication and canonical-artifact
scope while consuming shared relationship primitives where duplication would
otherwise produce different answers.

## Eligible document snapshot

The effective document root is `repositoryPaths(root).harness`. Recursively
enumerate `.md` regular files in normalized path order, without following any
symbolic link. Exclude:

- the resolved generated `index.md`;
- `graph-out/` and historical `graphify-out/`;
- `.harness-tmp/`, `.cache/`, `.harness.lock`, and Harness temporary/rollback
  siblings; and
- any path that fails repository/document-root containment.

Use normalized repository-relative POSIX paths as document IDs. Read all files
into memory, compute per-document SHA-256 values, repeat discovery and hashing,
and proceed only when both ordered path/digest lists match. Build from the first
captured bytes and define:

```text
source_digest = sha256("v1\0" + each(path + "\0" + content_sha256 + "\n"))
```

This establishes one internally coherent named snapshot without pretending to
lock external editors. `graph check` later performs the same discovery/digest
calculation against the working tree. Query commands never perform it.

## Markdown and YAML extraction

Run markdown-it 14.3.0 with HTML rendering disabled, linkify disabled, and
typographer disabled. Parse tokens; never render HTML.

- Title: string YAML `title`, else first H1 visible text, else filename without
  `.md`.
- Headings: visible text from heading inline tokens in source order.
- Body search text: visible inline text plus inline/fenced code content in source
  order. Remove Markdown syntax and link destination URLs; retain visible link
  labels. YAML control data is not body text.
- Standard link occurrences: local `link_open` destinations ending in `.md`
  before an optional `#fragment`; schemes, protocol-relative URLs, absolute
  paths, images, and non-Markdown attachments are not graph links.
- Wikilink occurrences: recognize `[[target]]`, `[[target|label]]`,
  `[[target#heading]]`, and `[[target^block]]` only within eligible plain-text
  inline tokens and string/scalar entries from parsed YAML properties. Do not
  recognize them inside inline/fenced code or raw HTML tokens.
- YAML property search: recursively inspect scalar strings and string arrays for
  wikilinks, but never treat non-string object keys or values as link targets.

Every occurrence has `{ kind, ordinal, raw_target }`, where `kind` is
`markdown`, `wikilink`, or `yaml`; ordinal is the zero-based source-order index
for that document. Preserve the raw fragment and alias evidence before
normalizing the document target.

## Resolution and graph invariants

Normalize URI encoding, Unicode NFC, separators, dot segments, aliases, and
fragments in one function. Resolution order is:

1. current-document identity for a fragment-only target;
2. exact safe path relative to the source directory;
3. exact safe path relative to the document root when the authored target is
   explicitly root-qualified by the supported syntax; and
4. one unique basename match for a pathless wikilink.

Path comparison is deterministic and case-sensitive on every platform. Zero
matches are broken; multiple basename matches are ambiguous and list sorted
candidates. Escaping, absolute, scheme-bearing, NUL-containing, or symlink
targets are unsafe. No non-resolved occurrence creates an edge.

The model invariants are:

- document IDs are sorted and unique;
- every eligible path owns exactly one document;
- logical edge key is `(source_id, target_id)` and is sorted/unique;
- every resolved occurrence appears exactly once beneath its logical edge;
- every non-resolved occurrence appears exactly once in `unresolved`;
- each source occurrence ordinal appears in exactly one edge or unresolved entry;
- all edge endpoints and candidates reference existing document IDs; and
- graph document IDs equal lexical document IDs exactly.

## Retrieval artifact schema

Publish only `graph-out/retrieval-index.json` with stable two-space JSON and one
trailing newline. Reject a serialized artifact larger than 128 MiB before
staging; reject a file larger than 128 MiB before query-side reading/parsing.

```json
{
  "schema_version": 1,
  "source_digest": "sha256:...",
  "engines": {
    "markdown_it": "14.3.0",
    "minisearch": "7.2.0",
    "options_digest": "sha256:..."
  },
  "documents": [
    {
      "id": "docs/harness/features/FEAT-009-....md",
      "title": "Build an exact Markdown document graph",
      "headings": ["Introduction"],
      "content_digest": "sha256:..."
    }
  ],
  "edges": [
    {
      "source": "...",
      "target": "...",
      "occurrences": [
        { "kind": "wikilink", "ordinal": 0, "raw_target": "FEAT-004" }
      ]
    }
  ],
  "unresolved": [
    {
      "source": "...",
      "kind": "yaml",
      "ordinal": 1,
      "raw_target": "missing",
      "status": "broken",
      "candidates": []
    }
  ],
  "search": {
    "document_ids": ["..."],
    "index": {}
  }
}
```

The concrete Zod schema rejects unknown top-level/nested fields, unsafe or
non-normalized IDs, duplicate/unsorted arrays, missing references, invalid
digests, unsupported engine/options versions, node/index mismatch, and invalid
occurrence partitioning. `search.index` is the output of MiniSearch `toJSON()`;
load it only after the surrounding owned schema and 128 MiB limit pass.

`graph build` constructs the complete JSON string in memory and publishes it
through `applyMutation()`. A validation hook reparses the staged bytes and checks
all invariants before rename. Existing complete output is unchanged on parse,
snapshot-divergence, size, lock, staging, validation, or publication failure.

## Lexical index and ranking

Create MiniSearch with `idField: "id"`, fields `path`, `title`, `headings`, and
`body`, and stored fields `path` and `title`. Normalize terms to Unicode NFC and
lowercase. Do not stem, remove stop words, enable prefix search, or enable fuzzy
search.

Search options are fixed for schema version 1:

- `combineWith: "AND"`;
- boosts: title `4`, path `2`, headings `2`, body `1`;
- default result limit `20`, accepted range `1..100`;
- final ordering: descending finite score, then ascending normalized path; and
- empty/whitespace-only queries fail as usage errors.

Each response includes `source_digest`, normalized query terms, result count,
and results with `reason: "lexical"`, ID/path/title, finite score, matched terms,
and matched fields. The command returns no neighbor unless a separate `graph
related` command is invoked.

## Related traversal

Resolve `TARGET` as an exact normalized document path first, then one unique
basename. Broken or ambiguous targets return resolution evidence and no graph
results. Options are:

- direction: `both` default; accepted `in`, `out`, or `both`;
- depth: `1` default; accepted `1..5`.

Build sorted inbound/outbound adjacency from validated edges and perform breadth-
first traversal. A document appears once at its shortest distance. When multiple
shortest paths exist, retain the lexicographically smallest sequence of document
IDs. The root appears separately as `reason: "identity"`; neighbors use
`reason: "relationship"` with distance, direction, and the selected explicit
path. Ordering is distance, then path. The result always includes the artifact's
`source_digest` and never reads Markdown.

## CLI and compatibility

The strict grammar is:

```text
ckh graph build [--workspace PATH] [--json]
ckh graph check [--workspace PATH] [--json]
ckh graph search QUERY [--limit N] [--workspace PATH] [--json]
ckh graph related TARGET [--direction in|out|both] [--depth N] [--workspace PATH] [--json]
```

Unknown arguments, old `--allow-external`, invalid numeric bounds, and invalid
direction values are usage errors. Build errors use existing precondition,
conflict, or invalid classification. Check reports missing/stale/malformed as
graph-specific non-success evidence without invalidating canonical Markdown or
the generated index. Search/related reject unavailable or invalid artifacts and
name `graph build`; they do not call `graph check` implicitly.

Remove the child-process dependency injection from `CliIo`, the Graphify adapter,
Graphify doctor warning, and Graphify-specific tests. Add `graph-out/` to owned
paths, discovery/watch exclusions, cleanup preview/confirmation, and configured-
layout behavior. Retain `graphify-out/` only in cleanup/exclusion compatibility.

Update current canonical runtime guidance—README, Plan/Self-Improve workflows,
and skill-port inventory—to name the built-in retrieval graph. Do not rewrite
historical Decisions, completed Plans, or Reports beyond explicit supersession
links already recorded by DEC-012.

## Verification design

Unit/property-style fixtures cover Markdown/YAML token contexts, Unicode/path
normalization, duplicate occurrences, exact/broken/ambiguous/unsafe resolution,
model invariants, schema rejection, deterministic serialization, MiniSearch
round-trip, stable ranking, and BFS direction/depth/path selection.

Integration fixtures cover default/configured layouts, shuffled discovery,
second-read divergence, symlink containment, lock/publication failures, stale
digests, cleanup, watcher exclusions, strict CLI human/JSON envelopes, package
contents, and packed CLI operation.

The performance harness generates 10,000 synthetic documents and 100,000 sorted
edges in a temporary directory, loads the artifact once, warms each query family,
then measures at least 100 direct searches and 100 depth-1 traversals. It records
p50/p95, asserts each p95 is at most 250 ms, and injects a filesystem read hook to
prove query execution performs zero Markdown reads. CI covers the supported
macOS × Node 20/22/24 matrix.
