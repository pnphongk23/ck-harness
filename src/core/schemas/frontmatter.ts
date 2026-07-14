import { parse, stringify } from "yaml";
import { harnessFrontmatterSchema, type HarnessFrontmatter } from "./artifacts.js";

export interface MarkdownDocument<T> {
  frontmatter: T;
  body: string;
}

export function parseMarkdownDocument(source: string): MarkdownDocument<HarnessFrontmatter> {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") throw new Error("missing opening frontmatter delimiter");
  const closing = lines.indexOf("---", 1);
  if (closing < 0) throw new Error("missing closing frontmatter delimiter");

  const value: unknown = parse(lines.slice(1, closing).join("\n"));
  return {
    frontmatter: harnessFrontmatterSchema.parse(value),
    body: lines.slice(closing + 1).join("\n").replace(/^\n/, ""),
  };
}

export function serializeMarkdownDocument(document: MarkdownDocument<HarnessFrontmatter>): string {
  const frontmatter = stringify(document.frontmatter, { lineWidth: 0 }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${document.body.trim()}\n`;
}
