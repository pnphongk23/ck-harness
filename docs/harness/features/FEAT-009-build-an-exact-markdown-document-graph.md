---
schema_version: 1
title: Build an exact Markdown document graph
relationships:
  specs: []
  decisions:
    - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
    - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
  plans:
    - "[[260719-1530-deliver-the-offline-markdown-relationship-graph/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
  source_paths:
    - src/core/integrity.ts
    - src/index/index.ts
    - src/adapters/index.ts
    - src/cli/index.ts
type: feature
id: FEAT-009
status: approved
created: 2026-07-19
approved: 2026-07-19
approved_by: Product Authority
---

# FEAT-009: Build an exact Markdown document graph

## Introduction

**Purpose:** Let a Repository Contributor or retrieval client find the smallest
complete set of Markdown documents relevant to an explicit keyword query or
document relationship traversal, using one fast, deterministic, repository-local
document graph and lexical index.

**In scope:**

- Discover every eligible Markdown document under the effective Harness document
  root resolved by [[FEAT-006-configure-harness-document-folders|FEAT-006]].
- Build exactly one document node per eligible file and preserve explicit local
  links from Obsidian-style wikilinks, ordinary Markdown links, and YAML property
  links.
- Build a lexical retrieval index over stable document identity, title, headings,
  and authored body text.
- Retrieve direct lexical matches and explicitly requested inbound/outbound graph
  neighborhoods through human-readable and machine-readable CLI results.
- Explain why each document was returned: lexical evidence remains distinct from
  relationship-expansion evidence.
- Keep all graph construction and retrieval local, offline, deterministic, and
  disposable.

**Out of scope:**

- Visualizing the graph, generating an interactive HTML view, or publishing a
  documentation website.
- Inferring semantic relationships, extracting entities, generating embeddings,
  fuzzy matching, stemming, model-based reranking, or transmitting Markdown to
  an external service.
- Treating a lexical match as a graph edge or silently adding graph neighbors to
  direct search results.
- Editing Markdown, creating or repairing links, rewriting links after rename,
  or changing canonical Harness validation policy.
- Indexing source-code imports, non-Markdown attachments, generated graph output,
  the generated Harness index, temporary mutation directories, or disposable
  output.
- Automatically rebuilding the retrieval graph from index-watch events.

### Evidence classification

- **Observed:** `src/core/integrity.ts` already derives sorted forward links,
  backlinks, and broken or ambiguous evidence from canonical Harness relationship
  frontmatter, but it does not scan links in arbitrary Markdown bodies.
- **Observed:** `src/adapters/index.ts` delegates `graph build` to Graphify 0.8.39,
  whose semantic extraction does not preserve explicit Markdown links as the
  authoritative edge set and may require external transmission permission.
- **Observed:** `src/cli/index.ts` exposes `graph check` and an external-oriented
  `graph build --allow-external`, but no local document retrieval command.
- **Observed:** Product Authority selected all Markdown under the configured
  document root, an explicit build, and the combined explicit-graph plus lexical
  retrieval policy on 2026-07-19.
- **Inferred:** Separating direct lexical matches from explicit relationship
  expansion is necessary to make every returned document explainable and to
  prevent search relevance from mutating graph truth.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Find the documents needed to understand or change repository behavior | Author valid Markdown and inspect retrieval evidence |
| Repository Maintainer | Business role | Maintain a complete, trustworthy, and fast local retrieval graph | Configure the document root, build/check the index, and correct source defects |
| Retrieval client | External system | Obtain bounded document candidates and explicit relationship context | Supply a query or document target and consume structured evidence without treating it as authority |

### User needs

- A Contributor needs keyword retrieval without scanning every Markdown file on
  each query.
- A Contributor needs to move from a known document to its explicit inbound and
  outbound neighbors without semantic guesses.
- A Maintainer needs proof that every eligible document, supported link, and
  lexical document record is represented exactly once at the logical level.
- A retrieval client needs stable identifiers, deterministic ordering, bounded
  result counts, and evidence explaining every returned document.
- A Maintainer needs missing, unsafe, and ambiguous targets to remain visible
  without being converted into guessed edges.

### Preconditions

- The repository resolves one valid Harness document root through the existing
  folder configuration contract.
- Eligible Markdown is readable within that root.
- Retrieval output can be written only to its allowlisted disposable location.

### Trigger

A Maintainer explicitly builds or checks the retrieval graph, or an actor submits
a keyword query or document-neighborhood request against the last complete build.

### Main flow

1. **Actor:** The Maintainer requests a graph build. **System:** The system
   resolves the effective document root and discovers every eligible Markdown
   file without crossing repository or symbolic-link boundaries.
2. **Actor:** The Maintainer waits for completion. **System:** The system extracts
   searchable document text and supported local links, creates one logical node
   and one lexical record per document, resolves explicit links, and retains
   broken or ambiguous occurrences without guessing.
3. **Actor:** The Maintainer receives the result. **System:** The system publishes
   one complete, versioned retrieval index only after all graph and lexical data
   agree on the same document set.
4. **Actor:** A Contributor or retrieval client submits a keyword query. **System:**
   The system searches the published lexical index without rereading source
   Markdown and returns bounded direct matches with stable identity, deterministic
   rank, and matched-term/field evidence.
5. **Actor:** The actor explicitly requests related context for a returned or
   known document. **System:** The system returns only the requested inbound,
   outbound, or bidirectional neighborhood to the requested bounded depth, with
   direction and distance evidence kept separate from lexical matches.

### Alternative flows

- **A1 — Resolve the default layout.** Source step: 1. Condition: no folder
  override exists. Behavior: the system uses the established `docs/harness/`
  document root. Resume at step: 2.
- **A2 — Inspect unresolved links.** Source step: 2. Condition: a supported link
  is broken, unsafe, or ambiguous. Behavior: the system records its source,
  occurrence, raw target, status, and candidates when applicable without creating
  a resolved edge. Resume at step: 3.
- **A3 — Retrieve by document identity.** Source step: 4. Condition: the actor
  supplies an exact repository-relative path or one unique pathless document
  identity instead of keywords. Behavior: the system returns that one document
  record or explicit broken/ambiguous evidence. Resume at step: 5.
- **A4 — Request no relationship expansion.** Source step: 5. Condition: the actor
  needs only lexical matches. Behavior: the system returns no neighbor solely
  because it is connected to a match. Ends with: direct lexical results only.

### Exception flows

- **E1 — Invalid or unavailable document root.** Source step: 1. Failure: the
  effective root cannot be resolved or read safely. Handling: report the exact
  path and corrective action. Prohibited: falling back to another directory or
  publishing partial success. Failure postcondition: existing retrieval output
  and authored Markdown remain unchanged.
- **E2 — Incomplete build.** Source step: 2 or 3. Failure: any eligible document
  cannot be parsed/indexed or the complete outcome cannot be published. Handling:
  report the failing document and preserve the last complete build. Prohibited:
  silently omitting a document, edge, unresolved occurrence, or lexical record.
  Failure postcondition: no partial build is current.
- **E3 — Missing, malformed, or incompatible retrieval index.** Source step: 4
  or 5. Failure: no complete compatible build can be loaded. Handling: return a
  non-success result naming `graph build` as remediation. Prohibited: scanning
  source Markdown as an implicit query fallback. Failure postcondition: no
  retrieval result is claimed.
- **E4 — Invalid or unbounded query.** Source step: 4 or 5. Failure: the query is
  empty, its limit/depth is outside documented bounds, or the document target is
  broken or ambiguous. Handling: return stable usage or resolution evidence.
  Prohibited: substituting an inferred target or unbounded traversal.

### Postconditions

- **Success — build:** The current retrieval artifact contains exactly the
  eligible document set, explicit relationship evidence, and matching lexical
  records for one source snapshot.
- **Success — query:** Every returned document is either a direct lexical match,
  the exact requested document, or an explicitly requested graph neighbor, and
  the response identifies which reason applies.
- **Failure:** Authored Markdown, the generated Markdown index, and the previous
  complete retrieval artifact are unchanged; no partial build is current, and a
  query result never claims that its named source snapshot matches the current
  working tree unless a separate freshness check established that fact.

## Requirements

- **FR-001 — Complete Markdown scope [Observed]:** The system shall include every
  `.md` document under the effective Harness document root exactly once by
  normalized repository-relative path and exclude the generated Harness index,
  retrieval output, temporary mutation paths, and other disposable output.
- **FR-002 — Supported explicit links [Observed]:** The system shall recognize
  document targets in `[[target]]`, `[[target|label]]`, heading/block-fragment
  variants, local `[label](target.md)` destinations, and quoted internal
  wikilinks stored in YAML scalar or list properties; document graph identity
  shall ignore a resolved target's heading or block fragment.
- **FR-003 — Exact relationship accounting [Inferred]:** The system shall emit
  one logical directed edge per unique source/target relationship, preserve every
  source occurrence as evidence, and preserve every broken, unsafe, or ambiguous
  occurrence without emitting a guessed edge.
- **FR-004 — Lexical document coverage [Observed]:** The lexical index shall
  contain exactly one record for every graph node and searchable fields for its
  normalized path, resolved title, headings, and authored body text, including
  authored code text while excluding link destinations and markup syntax.
- **FR-005 — Explicit complete build [Observed]:** `ckh graph build` shall create
  one versioned, disposable retrieval artifact for one complete source snapshot;
  it shall publish nothing current when graph and lexical document sets differ.
- **FR-006 — Direct lexical retrieval [Observed]:** `ckh graph search QUERY`
  shall return only documents matching all normalized query terms by default,
  with a default limit of 20, an explicit maximum of 100, stable tie-breaking,
  and document identity, score, matched terms, and matched fields in JSON output.
- **FR-007 — Explicit relationship retrieval [Observed]:** `ckh graph related
  TARGET` shall resolve an exact path or unique pathless identity and return a
  bounded neighborhood with selectable inbound, outbound, or both directions;
  the default depth shall be 1 and the maximum depth shall be 5.
- **FR-008 — Snapshot identity and freshness [Inferred]:** `ckh graph check`
  shall compare the artifact's source digest with the current eligible Markdown
  and reject stale, malformed, incompatible, or incomplete output. `graph search`
  and `graph related` shall reject malformed, incompatible, or incomplete output,
  shall return the artifact's source digest with every result, and shall not scan
  Markdown or claim current-working-tree freshness implicitly.
- **FR-009 — Human and machine results [Observed]:** Build, check, search, and
  related operations shall follow existing CLI human/JSON outcome conventions;
  equivalent inputs and options shall produce the same ordered logical result.
- **BR-001 — Markdown authority [Observed]:** Authored Markdown remains canonical;
  the graph, lexical index, scores, and query results are disposable derived state.
- **BR-002 — No inferred graph [Observed]:** Only supported explicit links may
  create graph edges; lexical similarity, shared terms, rank, entities, and model
  output are prohibited edge sources.
- **BR-003 — Separated retrieval reasons [Observed]:** Direct lexical matches,
  exact identity matches, and explicit graph expansion shall remain separately
  labeled; relationship expansion occurs only when requested.
- **BR-004 — No silent loss [Observed]:** A build shall fail rather than silently
  omit an eligible document, link occurrence, unresolved occurrence, or lexical
  record.
- **BR-005 — Optional derived capability [Observed]:** Missing or failed retrieval
  output shall not invalidate canonical Markdown, validation, index checks, or
  other Harness workflows.
- **NFR-001 — Offline privacy [Observed]:** Build and retrieval shall require no
  external network, model, service, repository-content transmission, watcher,
  Git operation, release, or deployment behavior.
- **NFR-002 — Deterministic and portable data [Inferred]:** Equivalent Markdown
  and effective folder configuration shall produce byte-identical ordered output
  on the supported macOS runtime matrix.
- **NFR-003 — Bounded query latency [Inferred]:** After loading a compatible
  artifact, direct search and depth-1 relationship retrieval over the
  repository-owned 10,000-document/100,000-edge benchmark corpus shall complete
  at p95 within 250 ms and shall not reread or reparse source Markdown.
- **NFR-004 — Safe containment [Observed]:** Discovery, target resolution, output
  publication, and result paths shall remain within their repository-contained
  configured boundaries without following symbolic links outside them.

## Acceptance

- [ ] The graph contains exactly one node and one lexical record for every
      eligible Markdown file, with identical sorted document identifiers in both
      sets and no generated/disposable file included.
- [ ] Wikilinks, alias links, fragment links, local Markdown links, and YAML
      property links produce the expected directed relationships; duplicate link
      occurrences share one logical edge while retaining every occurrence.
- [ ] Broken, unsafe, and ambiguous targets retain complete occurrence evidence
      and never create guessed edges.
- [ ] A multi-term search returns only documents matching every normalized term,
      uses stable ranking/path tie-breaking, respects limits, and reports matched
      terms and fields.
- [ ] Keyword search returns no linked-only neighbor; an explicit related request
      returns only the selected direction and bounded depth with distance evidence.
- [ ] `graph check` detects a stale source digest; search and related operations
      reject missing, malformed, or incompatible output, never scan Markdown,
      and identify the exact source digest represented by every result.
- [ ] Equivalent logical input produces byte-identical retrieval output when
      filesystem discovery order differs and across supported path separators.
- [ ] A build failure preserves the previous complete artifact and changes no
      authored Markdown or generated Markdown index.
- [ ] The fixed 10,000-document/100,000-edge benchmark meets the post-load p95
      query budget without reading source Markdown during retrieval.
- [ ] Build and retrieval complete without Graphify, visualization output, an
      LLM/embedding backend, external content transmission, Git, or a watcher.
- [ ] Removing all retrieval output loses no canonical knowledge and does not
      affect validation, index checks, or other Harness commands.

**Scenario: build an exact document retrieval graph**
Given a valid configured document root containing eligible Markdown
When the Maintainer runs `ckh graph build`
Then every eligible document appears exactly once as a node and lexical record
And every supported explicit relationship and unresolved occurrence is accounted
for
And no semantic or lexical relationship is added as an edge.

**Scenario: retrieve direct keyword matches**
Given a complete compatible retrieval artifact
When a retrieval client searches for multiple terms
Then only documents matching all normalized terms are returned up to the limit
And each result identifies its stable path, score, matched terms, and fields
And no document is returned solely because it links to a match.

**Scenario: expand explicit relationship context**
Given a complete compatible artifact and one uniquely resolved document
When a Contributor requests outbound related documents to depth 2
Then every returned neighbor is reachable by an explicit outbound path of at
most two edges
And every result identifies its distance and relationship path
And no inbound-only or lexically similar document is included.

**Scenario: prevent silent omissions and stale retrieval**
Given a complete artifact exists
When a later source snapshot cannot be completely indexed or publication fails
Then the previous complete artifact is preserved
And `graph check` reports that its source digest is stale
And queries identify that artifact's source digest without claiming it represents
the current working tree
And canonical Markdown and the generated Harness index remain unchanged.

## Relationships

- Related Feature: [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]] —
  existing deterministic relationship evidence and optional derived navigation.
- Related Feature: [[FEAT-006-configure-harness-document-folders|FEAT-006]] —
  resolves the effective Markdown document root and configured layout.
- Decision: [[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]] —
  requires separate authority before replacing the deferred Graphify capability.
- Decision: [[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]] —
  selects the shared explicit graph, Markdown parser, serialized lexical engine,
  snapshot artifact, and offline CLI retrieval boundary.
- Plan: [[260719-1530-deliver-the-offline-markdown-relationship-graph/plan|Plan]] —
  delivers the exact graph model, lexical artifact, query surface, migration,
  and verification sequence.
- Source: `src/core/integrity.ts`
- Source: `src/index/index.ts`
- Source: `src/adapters/index.ts`
- Source: `src/cli/index.ts`
