import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const wikilink = z.string().regex(/^\[\[[^\]|]+(?:\|[^\]]+)?\]\]$/, "expected an Obsidian wikilink");
const sourcePath = z.string().min(1).refine(
  (value) => !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes(".."),
  "expected a repository-relative POSIX path",
);

export const relationshipSchema = z.object({
  specs: z.array(wikilink).default([]),
  decisions: z.array(wikilink).default([]),
  plans: z.array(wikilink).default([]),
  reports: z.array(wikilink).default([]),
  rules: z.array(wikilink).default([]),
  features: z.array(wikilink).default([]),
  source_paths: z.array(sourcePath).default([]),
}).strict().superRefine((value, context) => {
  for (const [key, entries] of Object.entries(value)) {
    if (new Set(entries).size !== entries.length) {
      context.addIssue({ code: "custom", path: [key], message: "relationships must be unique" });
    }
  }
});

const base = {
  schema_version: z.literal(SCHEMA_VERSION),
  title: z.string().min(1),
  relationships: relationshipSchema,
};

export const featureSchema = z.object({
  ...base,
  type: z.literal("feature"),
  id: z.string().regex(/^FEAT-\d{3}$/),
  status: z.enum(["draft", "proposed", "approved", "active", "deprecated"]),
  created: date,
  approved: date.optional(),
  approved_by: z.string().min(1).optional(),
}).strict().superRefine((value, context) => {
  const needsApproval = ["approved", "active", "deprecated"].includes(value.status);
  if (needsApproval && !value.approved) {
    context.addIssue({ code: "custom", path: ["approved"], message: `${value.status} feature requires approval date` });
  }
  if (needsApproval && !value.approved_by) {
    context.addIssue({ code: "custom", path: ["approved_by"], message: `${value.status} feature requires approval authority` });
  }
  if (!needsApproval && (value.approved || value.approved_by)) {
    context.addIssue({ code: "custom", path: ["approved"], message: `${value.status} feature must not retain stale approval provenance` });
  }
});

export const specSchema = z.object({
  ...base,
  type: z.literal("spec"),
  status: z.enum(["draft", "active", "deprecated"]),
}).strict();

export const decisionSchema = z.object({
  ...base,
  type: z.literal("decision"),
  id: z.string().regex(/^DEC-\d{3}$/),
  status: z.enum(["proposed", "approved", "rejected", "superseded"]),
  created: date,
  approved: date.optional(),
  approved_by: z.string().min(1).optional(),
  rejected: date.optional(),
  recurrence_key: z.string().min(1).optional(),
  supersedes: wikilink.optional(),
}).strict().superRefine((value, context) => {
  const needsApproval = ["approved", "superseded"].includes(value.status);
  if (needsApproval && !value.approved) {
    context.addIssue({ code: "custom", path: ["approved"], message: `${value.status} decision requires approval date` });
  }
  if (needsApproval && !value.approved_by) {
    context.addIssue({ code: "custom", path: ["approved_by"], message: `${value.status} decision requires approval authority` });
  }
  if (value.status === "rejected" && !value.rejected) {
    context.addIssue({ code: "custom", path: ["rejected"], message: "rejected decision requires rejection date" });
  }
  if (!needsApproval && (value.approved || value.approved_by)) {
    context.addIssue({ code: "custom", path: ["approved"], message: `${value.status} decision must not retain approval provenance` });
  }
  if (value.status !== "rejected" && value.rejected) {
    context.addIssue({ code: "custom", path: ["rejected"], message: `${value.status} decision must not retain rejection provenance` });
  }
});

export const reportSchema = z.object({
  ...base,
  type: z.literal("report"),
  id: z.string().regex(/^REP-\d{3}$/),
  status: z.literal("completed"),
  delivered: date,
  recurrence_key: z.string().min(1).optional(),
  rule_candidate: z.boolean().optional(),
}).strict();

export const ruleSchema = z.object({
  ...base,
  type: z.literal("rule"),
  id: z.string().regex(/^RULE-\d{3}$/),
  status: z.enum(["active", "deprecated", "superseded"]),
  approved: date,
  scope: z.array(z.string().min(1)).min(1),
}).strict();

export const artifactSchema = z.discriminatedUnion("type", [
  featureSchema,
  specSchema,
  decisionSchema,
  reportSchema,
  ruleSchema,
]);

export type ArtifactFrontmatter = z.infer<typeof artifactSchema>;

const planStatus = z.enum(["pending", "in_progress", "in-progress", "completed", "blocked", "cancelled"]);

export const planApprovalSchema = z.object({
  status: z.enum(["pending", "changes_requested", "approved"]),
  required_by: z.string().min(1),
  decided: date.optional(),
}).strict().superRefine((value, context) => {
  if (value.status !== "pending" && !value.decided) {
    context.addIssue({ code: "custom", path: ["decided"], message: `${value.status} approval requires decision date` });
  }
  if (value.status === "pending" && value.decided) {
    context.addIssue({ code: "custom", path: ["decided"], message: "pending approval must not retain a decision date" });
  }
});

export const planSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  status: planStatus,
  approval: planApprovalSchema,
  priority: z.enum(["P1", "P2", "P3"]),
  effort: z.string(),
  branch: z.string().min(1),
  tags: z.array(z.string().min(1)),
  blockedBy: z.array(z.string().min(1)),
  blocks: z.array(z.string().min(1)),
  relationships: relationshipSchema,
  status_reason: z.string().min(1).optional(),
  created: z.string().datetime({ offset: true }),
  createdBy: z.string().min(1),
  source: z.string().min(1).optional(),
}).strict().superRefine((value, context) => {
  if (["blocked", "cancelled"].includes(value.status) && !value.status_reason) {
    context.addIssue({ code: "custom", path: ["status_reason"], message: `${value.status} plan requires status reason` });
  }
  if (value.approval.status !== "approved" && ["in_progress", "in-progress", "completed"].includes(value.status)) {
    context.addIssue({ code: "custom", path: ["approval"], message: `${value.status} plan requires approved execution authority` });
  }
});

export const workItemSchema = z.object({
  work_item: z.number().int().positive(),
  title: z.string().min(1),
  status: planStatus,
  priority: z.enum(["P1", "P2", "P3"]),
  effort: z.string(),
  dependencies: z.array(z.number().int().positive()),
  decision_dependencies: z.array(wikilink).default([]),
  status_reason: z.string().min(1).optional(),
}).strict().superRefine((value, context) => {
  if (["blocked", "cancelled"].includes(value.status) && !value.status_reason) {
    context.addIssue({ code: "custom", path: ["status_reason"], message: `${value.status} work item requires status reason` });
  }
});

export const harnessFrontmatterSchema = z.union([artifactSchema, planSchema, workItemSchema]);
export type HarnessFrontmatter = z.infer<typeof harnessFrontmatterSchema>;

const patterns = {
  feature: /^(FEAT-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
  decision: /^(DEC-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
  report: /^(REP-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
  rule: /^(RULE-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
  spec: /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/,
} as const;

export function validateArtifactFilename(filename: string, artifact: ArtifactFrontmatter): string[] {
  const match = patterns[artifact.type].exec(filename);
  if (!match) return [`invalid ${artifact.type} filename: ${filename}`];
  if ("id" in artifact && match[1] !== artifact.id) {
    return [`filename ID ${match[1]} does not match frontmatter ID ${artifact.id}`];
  }
  return [];
}
