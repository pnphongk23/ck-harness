// CLI command parsing begins in Phase 4. This module intentionally has no
// executable side effects and cannot launch agent runtimes.
export const CLI_BOUNDARY = "routing-only" as const;
