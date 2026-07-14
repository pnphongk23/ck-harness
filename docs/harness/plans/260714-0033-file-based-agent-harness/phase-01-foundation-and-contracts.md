---
phase: 1
title: "Foundation and Contracts"
status: completed
priority: P1
effort: "2-3 days"
dependencies: []
decision_dependencies: []
---

# Phase 1: Foundation and Contracts

## Overview

Establish the product boundary, repository contract, naming invariants, package skeleton, and file ownership rules before implementing storage or workflows. This phase prevents the new harness from inheriting the database and generated-file complexity of the upstream project.

## Requirements

- All durable business and engineering documents live under `docs/harness/`.
- Root `AGENTS.md` and `CLAUDE.md` remain short routers, not duplicated operating manuals.
- CLI behavior is deterministic and must never start Claude, Codex, Cursor, AGY, or another agent.
- Markdown files are canonical; `index.md` is derived except for its CLI-owned monotonic sequence metadata.
- Feature IDs match `^FEAT-[0-9]{3}$`, are immutable, unique, monotonic, and never reused.
- Feature filenames match `FEAT-XXX-kebab-name.md` and retain the same ID when the slug changes.
- Specs use semantic filenames without generated IDs.
- Plans use ClaudeKit directory naming `{date}-{issue}-{slug}` with `YYMMDD-HHmm` dates and retain `plan.md` plus `phase-XX-name.md` files.
- MVP is single-writer and file-first; no SQLite, MCP server, trace directory, or agent runtime is included.

## Architecture

- Runtime: Node.js 20+, TypeScript, npm package exposing the `harness` binary.
- Parsing: a real YAML/frontmatter parser; no regex-based frontmatter mutation.
- Watching: a cross-platform watcher with debounce and self-write suppression.
- Writes: validate target paths, write a sibling temporary file, fsync where supported, then atomic rename.
- Boundaries: `src/cli/` parses commands; `src/core/` owns models and invariants; filesystem, index, watcher, and adapter logic remain separate modules.

## Related Code Files

- Create: `package.json`, `tsconfig.json`, `src/`, `tests/`, `.gitignore`.
- Create: `AGENTS.md`, `CLAUDE.md`, `docs/harness/README.md`.
- Create: `docs/harness/{features,specs,decisions,reports,rules,templates,workflows}/`.
- Preserve: `docs/harness/plans/` and this CK-generated plan.

## Implementation Steps

1. Record the approved terminology and non-goals in `docs/harness/README.md`.
2. Define artifact types, prefixes, statuses, required frontmatter, and relationship fields in a versioned schema document.
3. Define naming rules:
   - Feature: `FEAT-XXX-kebab-name.md`.
   - Decision: `DEC-XXX-kebab-name.md`.
   - Report: `REP-XXX-kebab-name.md`.
   - Rule: `RULE-XXX-kebab-name.md`.
   - Spec: semantic kebab-case filename without ID.
   - Plan: unchanged ClaudeKit naming and internal phase layout.
4. Define link format as Obsidian wikilinks, preferring `[[full-basename|ID]]` for ID-bearing artifacts and semantic links for specs.
5. Define deletion behavior: referenced features default to deprecation; forced deletion must report and require explicit acceptance of affected links.
6. Scaffold the TypeScript package and module boundaries without implementing commands.
7. Add licensing and provenance policy for all adapted skills.
8. Document single-writer limitations and recovery through `index build/check`.

## Risks

- Frontmatter and filename IDs can drift; validation must compare both.
- A slug rename can break wikilinks; rename must rewrite inbound links atomically as one supervised CLI operation.
- Project-local Claude skills can be shadowed by personal skills of the same name; use the `harness-*` namespace.

## Success Criteria

- [x] Product boundary, non-goals, artifact taxonomy, and ownership rules are documented.
- [x] Naming and ID rules have positive and negative examples.
- [x] Package skeleton builds without generating committed build output.
- [x] Root router documents point to `docs/harness/index.md` and workflow docs only.
- [x] No runtime dependency on SQLite, Rust, an agent CLI, or Graphify is introduced.

## Verification Evidence

- `npm run check` passed on 2026-07-14.
- `npm test` passed the package boundary and root-router contract tests on 2026-07-14.
