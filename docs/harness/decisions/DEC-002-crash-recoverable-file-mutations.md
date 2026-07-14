---
schema_version: 1
title: Define crash-recoverable file mutation semantics
relationships:
  specs: []
  decisions: []
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
  source_paths:
    - docs/harness/RULES.md
    - src/fs/index.ts
type: decision
id: DEC-002
status: proposed
created: 2026-07-14
---

# DEC-002: Define crash-recoverable file mutation semantics

## Context

Feature creation updates a sequence and publishes a new file; Feature rename can replace one file, remove another path, rewrite several inbound wikilinks, and rebuild the index. A filesystem provides atomic replacement for one rename, not one indivisible transaction spanning every affected path. The CLI must preserve user changes, support one CLI writer, avoid a durable hidden state store, and never report a partially completed mutation as success.

## Decision

Implement a single-writer, crash-recoverable batch mutation protocol using repository-contained staged files, backups, and a short-lived transaction manifest under an ignored `.harness-tmp/` directory.

The protocol is:

1. Inspect any prior unfinished transaction before serving another command. Automatic recovery is allowed only when every affected path still matches a preimage or postimage hash recorded in the manifest; any divergent file blocks recovery without writing.
2. Acquire an exclusive repository mutation lock and record a unique owner token plus process metadata.
3. Read all preimages and record their content hashes; stage every new file and required backup under one transaction directory.
4. Flush staged content, validate the complete overlay, then flush a versioned manifest before publication begins.
5. Recheck all preimage hashes immediately before publication, replace targets one at a time with bounded Windows sharing-violation retries, and record progress durably. The protocol is optimistic: no filesystem primitive can prevent an unrelated editor from writing between the final hash check and rename.
6. On a handled publication failure, restore replaced targets only when their current hashes still match the transaction's recorded postimages. On abrupt process termination, the next CLI invocation automatically continues only a manifest-consistent state; otherwise it blocks and reports every divergent path.
7. Remove the manifest, backups, transaction directory, and lock only after the final state is validated.

Expose `harness recover status`, `harness recover continue`, and `harness recover rollback`. `status` is read-only. `continue` and `rollback` require an unfinished transaction, display the affected paths, refuse divergent content by default, and require explicit `--force` confirmation before replacing a divergent path. Stale or uncertain lock ownership is never cleared merely from a timestamp or reusable PID.

This provides command-level success semantics, handled rollback when hashes still match, and deterministic classification of crash recovery states. It does not claim that several filesystem renames occur simultaneously or that an unrelated concurrent editor can be made transactional. The transient manifest is recovery metadata, not canonical history or a trace ledger, and must never be committed or indexed.

## Alternatives

1. **Validated sibling writes with best-effort rollback only.** This is the simplest implementation and satisfies per-file atomic replacement, but a crash after the first rename can expose a partial batch with no deterministic recovery evidence.
2. **Staged batch with backups, hash-guarded recovery, and an explicit recovery interface — recommended.** This adds bounded transient state but supports handled rollback, crash-state classification, user-change protection, and truthful success semantics while keeping Markdown canonical.
3. **Whole-tree generations with an atomic active-generation pointer.** This can make one logical snapshot switch atomic, but changes canonical paths, complicates Obsidian links and external editing, duplicates the entire Harness tree, and conflicts with the approved file layout.

## Consequences

- `.harness-tmp/` becomes an explicitly documented, ignored, disposable runtime path; it stores no completed transaction history.
- Read-only commands encountering an unfinished transaction may report status but must not trust or mutate an unresolved divergent state.
- External edits are protected by preimage hash checks; a conflict blocks publication rather than overwriting user content.
- Hash checks reduce but cannot eliminate a concurrent external-write race. The documented single-writer precondition covers CLI writers; detected external divergence always blocks unless the human explicitly authorizes a recovery action.
- Stale-lock handling must prefer a safe false-positive block over breaking a live writer. PID reuse or uncertain ownership is resolved through the recovery interface, never automatic forced unlock.
- Failure-injection tests are required before, during, and after publication, including recovery and cleanup.
- After approval, the Feature and command contract must add the recovery commands and describe command-level success, handled rollback, crash-state classification, and the external-write limitation rather than impossible simultaneous multi-file rename semantics.

## Evidence

- [[FEAT-001-harness-cli|FEAT-001]]
- [[260714-0033-file-based-agent-harness/plan|Plan]]
- `docs/harness/RULES.md` R-002, R-012, R-019, R-020, R-025, and R-026.
- `src/fs/index.ts` is currently a repository-scoped stub.
- Node.js supports flushed writes and filesystem rename primitives, but exposes them per path rather than as a multi-path transaction: https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html

## Supersession

This decision supersedes no earlier decision.
