---
work_item: 3
title: "Derived Consumer Integration"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1, 2]
decision_dependencies: []
---

# Work Item 3: Derived Consumer Integration

## Scope

Make integrity scanning, index rendering and publication, and watching consume
the same effective layout. Graphify and any replacement graph technology are
outside this Work Item under DEC-010.

## Implementation steps

1. Replace fixed artifact enumeration, Plan layout checks, scope validation,
   index links, diagnostics, and health prerequisites with logical layout paths.
2. Parameterize Plan-local design detection, Plan layout validation, relationship
   target generation, scoped validation, and their remediation messages from
   the configured Plans folder rather than `plans/` or `docs/harness/` literals.
3. Preserve deterministic index ordering and repository-relative POSIX output
   while allowing configured folders to be rendered in catalog and findings.
4. Update watcher bind, ignore, rebind, and degradation behavior to watch only
   configured collections plus required root-level artifacts, without observing
   unrelated documentation outside the allowlist.
5. Add tests for scoped validation, deterministic index rebuild/check, watcher
   reconciliation, and invalid-layout failure-before-operation behavior.

## Success criteria

- [x] Validation, index check/build, and doctor report paths from a custom
      layout and preserve default-layout outputs.
- [x] Watcher reconciliation remains limited to the effective Harness scope and
      recovers correctly when its configured root is removed or replaced.
- [x] Plan-local design, Plan layout, relationship resolution, doctor, and
      every remediation path use configured logical folders.
- [x] Derived index files remain non-authoritative and no scan, watch, or
      configured operation falls back to the old directory; graph technology is
      not changed by this delivery.

## Required evidence

- `npm run check && node --test dist/tests/integrity.test.js dist/tests/index-build.test.js dist/tests/index-resolution.test.js dist/tests/index-watch.test.js`
  Verification command runs and all 36 tests pass successfully:
  ```
  ℹ tests 36
  ℹ suites 0
  ℹ pass 36
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 1075.332542
  ```
- Deterministic index byte comparison for repeated custom-layout fixtures.
  Verified by test `"buildIndex generates deterministic index for custom layout fixtures"`, checking that repeated runs produce identical byte-for-byte outputs on index files.
