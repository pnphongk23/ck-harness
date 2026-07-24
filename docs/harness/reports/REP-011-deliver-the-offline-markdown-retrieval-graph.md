---
schema_version: 1
title: Deliver the offline Markdown retrieval graph
relationships:
  specs: []
  decisions:
    - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
  plans:
    - "[[260719-1530-deliver-the-offline-markdown-relationship-graph/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-009-build-an-exact-markdown-document-graph|FEAT-009]]"
  source_paths:
    - src/graph/model.ts
    - src/graph/markdown.ts
    - src/graph/artifact.ts
    - src/graph/build.ts
    - src/graph/query.ts
    - src/cli/index.ts
    - .github/workflows/verify.yml
type: report
id: REP-011
status: completed
delivered: 2026-07-24
---

# REP-011: Deliver the offline Markdown retrieval graph

## Delivered outcome

The approved FEAT-009 graph retrieval scope is delivered for macOS. The
implementation builds one deterministic Markdown relationship graph and
versioned MiniSearch artifact, publishes it atomically, and exposes offline
`graph build`, `graph check`, `graph search`, and `graph related` commands.
Linux and Windows acceptance are intentionally out of scope.

## Changed files

- `src/graph/` — deterministic Markdown model, parser, artifact publication,
  and bounded retrieval queries.
- `src/cli/index.ts` — built-in graph CLI commands and JSON/human envelopes.
- `src/fs/repository.ts`, `src/core/lifecycle.ts`, `src/watcher/index.ts` —
  graph output allowlisting, cleanup, and watch exclusions.
- `docs/harness/workflows/plan.md` and related Harness guidance — built-in
  retrieval workflow and verification contract.
- `.github/workflows/verify.yml` — macOS-only CI OS scope.

## Verification evidence

- `npm run verify` — passed 120/120 tests on macOS with Node 22.20.1.
- `ckh validate --all --json` — passed with no findings.
- `ckh index build --json` and `ckh index check --json` — passed; index is
  byte-current.
- `ckh doctor --json` — passed.
- `npm audit --omit=dev --audit-level=high` — found 0 vulnerabilities.
- `npm pack --dry-run --json` and fresh temporary packed-CLI smoke — passed
  build/check/search/related JSON flows.
- `git diff --check` — passed.
- Benchmark test — 10,000 documents, 100,000 edges, 100 search/related
  samples, p95 within 250 ms, and zero source reads.

## Plan variance

The delivery scope was narrowed to macOS-only per Maintainer direction. The
existing workflow retains Node 20/22/24 coverage on macOS; Linux and Windows
validation are not claimed.

## Repeated friction

The packed smoke test exposed locale-dependent ordering in graph discovery;
replacing it with code-point-stable ordering resolved the issue and the full
suite was rerun successfully.
