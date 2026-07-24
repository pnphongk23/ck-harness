---
schema_version: 1
type: decision
id: DEC-011
title: Build the Markdown graph with the Harness resolver and Cytoscape.js
status: superseded
created: 2026-07-19
approved: 2026-07-19
approved_by: Repository Maintainer
supersedes: "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
relationships:
  specs: []
  decisions:
    - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
    - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
  plans: []
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
    - "[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]]"
  source_paths:
    - package.json
    - src/core/integrity.ts
    - src/index/index.ts
    - src/adapters/index.ts
    - src/cli/index.ts
---

# DEC-011: Build the Markdown graph with the Harness resolver and Cytoscape.js

## Context

This Decision interrupts Plan creation for
[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]] and returns to
that Plan boundary after selecting the graph data owner, renderer, input scope,
privacy model, output ownership, and compatibility transition required by
[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]].

The current derived index already creates deterministic forward edges,
backlinks, and unresolved evidence from lifecycle-artifact relationship
frontmatter. Its resolver is private to `src/core/integrity.ts` and scans only
canonical artifact and Plan files. The current graph adapter instead invokes
Graphify 0.8.39 over fixed `docs/harness/` input. Graphify performs semantic
document extraction, may use an external model backend, writes its own graph
schema, and does not treat explicit Markdown file links as the authoritative
edge set.

FEAT-009 expands the desired link graph to every Markdown document under the
effective document root, supports wikilinks, ordinary Markdown links, and YAML
property links, requires deterministic broken/ambiguous evidence, and prohibits
semantic inference or external content transmission. The implementation must
therefore separate deterministic relationship extraction from interactive
rendering.

## Decision

Create one repository-owned, deterministic Markdown relationship model and make
it the shared source for graph JSON, graph integrity evidence, and any derived
index relationship rendering. Generalize the existing Harness resolver rather
than adding a second link-resolution implementation.

The resolver shall:

- take the effective document root resolved by the repository-folder contract;
- discover every eligible Markdown file without following unsafe boundaries;
- parse supported links from Markdown content and YAML properties;
- resolve safe exact relative paths first and unique pathless wikilink basenames
  second;
- preserve broken and ambiguous evidence without producing guessed edges; and
- return sorted, versioned, serialization-ready nodes, resolved directed edges,
  and unresolved entries independently from any renderer.

Use Cytoscape.js as the interactive renderer. Add its MIT-licensed npm package as
a pinned runtime dependency and bundle its distributable browser asset into the
generated HTML so the graph remains usable without a CDN or network connection.
The browser receives only the versioned graph data and owns transient layout,
filter, selection, and neighborhood state; layout coordinates are never
canonical graph data.

`ckh graph build` shall build offline without `--allow-external` and atomically
publish a matching `graph.json` and `graph.html` beneath an allowlisted
`graph-out/` directory in the effective document root. The directory is
disposable, excluded from Markdown discovery and watch invalidation, and removed
only through explicit cleanup. A failed build preserves the previous complete
pair. Historical `graphify-out/` remains disposable cleanup compatibility but is
never a new-build target.

`ckh graph check` shall remain read-only but stop probing for a Graphify
executable. It shall report the built-in renderer capability and validate the
presence, schema agreement, and current-input digest of any published graph
pair. Absence remains a warning because graph output is optional; malformed or
stale output is graph-specific evidence and cannot invalidate canonical
Markdown or the generated Markdown index.

Remove the Graphify process adapter and `--allow-external` grammar from the
active graph-build path. Do not retain a compatibility no-op for that flag:
strict parsing shall report the new offline usage so callers cannot mistake the
new command for external semantic extraction.

## Alternatives

1. **Use Obsidian or Foam as the only graph viewer.** This requires almost no
   repository code and provides mature local/global graph interaction. It does
   not provide a package-owned `ckh graph build`, deterministic serialized
   evidence, stable cross-runtime behavior, or CLI verification. It remains a
   valid optional authoring/viewing tool but cannot satisfy FEAT-009 by itself.
2. **Generate Graphify-compatible JSON and use Graphify only as a renderer.**
   This reuses the installed executable and its interactive HTML, while avoiding
   semantic extraction. It couples Harness to a non-owned graph schema and
   multi-purpose `cluster-only` workflow, retains a Python executable boundary,
   generates unrelated reports and clustering state, and currently loads the
   renderer from a CDN. It is smaller as a spike but weaker for offline privacy,
   deterministic ownership, packaging, and maintenance.
3. **Use a shared Harness resolver with Cytoscape.js — selected.** This reuses
   the working deterministic resolution boundary and a focused production graph
   library while keeping data ownership, privacy, CLI behavior, and verification
   inside the Node.js package. It requires one runtime dependency and a small
   repository-owned HTML shell, but both are independently testable and
   reversible.

Cosma and Quartz were also reviewed but are not separate viable choices for this
boundary. Cosma's direct Markdown mode gives a record `id` precedence over its
title and extracts content links using its own convention, which does not match
the current basename-target relationship contract without an adapter. Quartz is
a complete documentation-site generator, and its graph component requires its
ContentIndex pipeline and CDN-loaded rendering libraries. Either would expand
the delivery beyond a disposable local CLI view.

## Consequences

- The Markdown relationship model becomes a reusable core boundary; rendering
  libraries and graph output never become the authority for link resolution.
- Index rendering must consume the shared resolver without expanding index
  catalog scope beyond the separately governed canonical Harness artifacts.
- Graph data is byte-stable for equivalent logical input; interactive force
  layout is intentionally transient and need not be byte-stable.
- The package gains one pinned Cytoscape.js runtime dependency and must preserve
  its license notice in distributed artifacts.
- Browser HTML must embed or package local renderer code and graph data safely;
  Markdown-derived labels, paths, and link text require script/HTML escaping and
  must never become executable markup.
- `graph build` no longer needs external-transmission acknowledgement and cannot
  invoke Graphify, an LLM, Git, a watcher, release, or deployment behavior.
- `graph check` changes from external-executable discovery to built-in output
  validation. Existing callers using `--allow-external` receive a strict usage
  error and must remove the obsolete flag.
- New graph output follows the configured document root while legacy
  `graphify-out/` remains cleanup-only historical state.
- FEAT-004's canonical Markdown/index fallback remains intact; optional graph
  failure cannot invalidate other Harness capabilities.
- The implementing Plan must include dependency/license verification, graph
  schema and atomic-publication tests, hostile content escaping, containment and
  symlink cases, deterministic discovery-order tests, CLI compatibility tests,
  and packaged offline-browser verification.

## Evidence

- [[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]] defines the
  approved observable behavior and offline privacy boundary.
- [[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]] requires
  this separate technology, input, privacy, output, and verification decision.
- `src/core/integrity.ts` currently owns sorted exact wikilink candidates,
  broken/ambiguous classification, forward edges, and backlinks.
- `src/adapters/index.ts` currently invokes fixed Graphify directory extraction
  only after external-transmission acknowledgement.
- `src/cli/index.ts` currently exposes Graphify-oriented `graph check` and
  `graph build --allow-external` grammar.
- `package.json` requires Node.js 20 or newer and contains only focused Node.js
  runtime dependencies.
- `npm view cytoscape version license dependencies exports --json` on
  2026-07-19 reported version 3.34.0, MIT licensing, no runtime dependency list,
  and an exported `./dist/cytoscape.min.js` browser asset.
- Cytoscape.js documents JSON-serializable graph elements, built-in layouts,
  selectors, graph algorithms, browser interaction, MIT licensing, and no
  external dependencies.
- Repository Maintainer approved the selected approach on 2026-07-19 after
  comparison with direct Obsidian/Foam use, Graphify renderer reuse, Cosma, and
  Quartz.

## Supersession

This decision supersedes
[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]. DEC-010's
deferral remains historical evidence; this Decision supplies the separately
approved technology and operational boundary it required. DEC-006 remains
historical authority for the delivered Graphify adapter and is not revived.

This Decision is superseded by
[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]
because Product Authority clarified that retrieval, not relationship
visualization, is the required outcome. Its deterministic resolver and offline
privacy constraints carry forward; its Cytoscape, HTML, and browser-view choices
do not.
