import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { parse as parseYaml } from "yaml";
import { buildMarkdownGraph, type CapturedFile, type GraphDocument, type LinkKind, type LinkOccurrence } from "./model.js";

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });

function splitFrontmatter(source: string): { frontmatter: unknown; body: string } {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return { frontmatter: {}, body: normalized };
  const closing = normalized.indexOf("\n---", 4);
  if (closing < 0) return { frontmatter: {}, body: normalized };
  const end = closing + 4;
  return { frontmatter: parseYaml(normalized.slice(4, closing)) ?? {}, body: normalized.slice(end).replace(/^\n/, "") };
}

function visibleText(token: Token | undefined): string {
  if (!token) return "";
  if (token.type === "text" || token.type === "code_inline" || token.type === "code_block" || token.type === "fence") return token.content;
  return (token.children ?? []).map((child) => child.type === "image" ? "" : visibleText(child)).join("");
}

function addWikilinks(value: string, kind: LinkKind, occurrences: LinkOccurrence[], next: { value: number }): string {
  const pattern = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  return value.replace(pattern, (_match, target: string) => {
    occurrences.push({ kind, ordinal: next.value++, raw_target: target.trim() });
    return "";
  });
}

function walkYaml(value: unknown, occurrences: LinkOccurrence[], next: { value: number }): void {
  if (typeof value === "string") addWikilinks(value, "yaml", occurrences, next);
  else if (Array.isArray(value)) for (const entry of value) walkYaml(entry, occurrences, next);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) walkYaml(entry, occurrences, next);
}

function parseDocument(file: CapturedFile): Omit<GraphDocument, "id" | "path" | "content_digest"> {
  const { frontmatter, body } = splitFrontmatter(file.content);
  const tokens = markdown.parse(body, {});
  const occurrences: LinkOccurrence[] = [];
  const next = { value: 0 };
  walkYaml(frontmatter, occurrences, next);
  const headings: string[] = [];
  const bodyParts: string[] = [];
  for (const token of tokens) {
    if (token.type === "heading_open") continue;
    if (token.type === "inline") {
      const heading = token.map && tokens[tokens.indexOf(token) - 1]?.type === "heading_open";
      if (heading) headings.push(visibleText(token).trim());
      const children = token.children ?? [];
      for (const [index, child] of children.entries()) {
        if (child.type === "link_open") {
          const href = child.attrGet("href") ?? "";
          if (/^\.?.*\.md(?:#.*)?$/i.test(href) && !/^([A-Za-z][A-Za-z+.-]*:|\/|\/\/)/.test(href)) {
            occurrences.push({ kind: "markdown", ordinal: next.value++, raw_target: href });
          }
        }
        if (child.type === "text") addWikilinks(child.content, "wikilink", occurrences, next);
        if (child.type !== "link_open" && child.type !== "link_close") bodyParts.push(visibleText(child));
        if (child.type === "link_open") bodyParts.push(visibleText(children[index + 1]));
      }
    } else if (token.type === "code_block" || token.type === "fence") {
      bodyParts.push(token.content);
    }
  }
  const titleValue = frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter) ? (frontmatter as Record<string, unknown>).title : undefined;
  const title = typeof titleValue === "string" && titleValue.trim() ? titleValue.trim() : headings[0] || file.id.split("/").pop()!.replace(/\.md$/i, "");
  return { title, headings, body: bodyParts.join(" ").replace(/\s+/g, " ").trim(), occurrences };
}

export async function buildMarkdownDocumentGraph(root: string) {
  return buildMarkdownGraph(root, parseDocument);
}

export { parseDocument };
