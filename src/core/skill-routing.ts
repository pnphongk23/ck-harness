export const skillNames = [
  "ask",
  "brainstorm",
  "scout",
  "harness-feature",
  "harness-decision",
  "harness-plan",
  "harness-cook",
  "harness-self-improve",
] as const;

export type SkillName = typeof skillNames[number];

export function selectHarnessSkill(prompt: string): SkillName | undefined {
  const normalized = prompt.toLowerCase();
  const explicit = skillNames.find((name) => new RegExp(`\\b${name}\\b`).test(normalized));
  if (explicit) return explicit;
  if (/\bresearch\b.{0,60}\b(?:project|repository|codebase)\b|\b(?:project|repository|codebase) research\b|\b(locate|find|map|search)\b.*\b(files?|codebase|repository|symbols?|tests?)\b|\bwhere (?:does|is|are)\b.*\b(?:implemented|defined|located)\b/.test(normalized)) return "scout";
  if (/\b(brainstorm|ideat(?:e|ion)|explore (?:solutions?|approaches?)|solution options?)\b/.test(normalized)) return "brainstorm";
  if (/\b(technical|architecture|architectural) (?:question|consultation|advice|guidance)\b|\bbest practices?\b/.test(normalized)) return "ask";
  if (/\b(requirements?|discover|clarify|reverse[- ]engineer|business behavior)\b/.test(normalized)) return "harness-feature";
  if (/\b(decide|decision|trade-?offs?|alternatives?)\b/.test(normalized)) return "harness-decision";
  if (/\b(plan|work[ -]?items?|implementation plan)\b/.test(normalized) && !/\b(implement|build|cook)\b/.test(normalized)) return "harness-plan";
  if (/\b(implement|build|cook|execute the approved plan)\b/.test(normalized)) return "harness-cook";
  if (/\b(self[- ]?improve|learn(?:ing)?|graph|wikilinks?|promote|recurring (?:friction|rule))\b/.test(normalized)) return "harness-self-improve";
  return undefined;
}
