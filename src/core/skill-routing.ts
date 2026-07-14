export const skillNames = [
  "harness-feature",
  "harness-decision",
  "harness-plan",
  "harness-cook",
  "harness-self-improve",
] as const;

export type SkillName = typeof skillNames[number];

export function selectHarnessSkill(prompt: string): SkillName | undefined {
  const normalized = prompt.toLowerCase();
  const explicit = skillNames.find((name) => normalized.includes(name));
  if (explicit) return explicit;
  if (/\b(requirements?|discover|clarify|reverse[- ]engineer|business behavior)\b/.test(normalized)) return "harness-feature";
  if (/\b(decide|decision|trade-?offs?|alternatives?)\b/.test(normalized)) return "harness-decision";
  if (/\b(plan|phases?|implementation plan)\b/.test(normalized) && !/\b(implement|build|cook)\b/.test(normalized)) return "harness-plan";
  if (/\b(implement|build|cook|execute the approved plan)\b/.test(normalized)) return "harness-cook";
  if (/\b(self[- ]?improve|learn(?:ing)?|graph|wikilinks?|promote|recurring (?:friction|rule))\b/.test(normalized)) return "harness-self-improve";
  return undefined;
}
