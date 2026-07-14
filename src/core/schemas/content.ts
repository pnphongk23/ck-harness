const FEATURE_SECTIONS = [
  "Introduction",
  "Business Understanding",
  "Requirements",
  "Acceptance",
  "Relationships",
] as const;

const implementationActorTerms = /\b(class|module|microservice|service class|repository class|controller|package)\b/i;

export function validateFeatureContent(body: string): string[] {
  const errors: string[] = [];
  const headings = body.split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim());

  if (headings.join("|") !== FEATURE_SECTIONS.join("|")) {
    errors.push(`feature must contain exactly these H2 sections: ${FEATURE_SECTIONS.join(", ")}`);
  }

  const actorSection = section(body, "### Actors", "### User needs");
  if (implementationActorTerms.test(actorSection)) {
    errors.push("actors must be business roles or external systems, not implementation components");
  }

  const mainFlow = section(body, "### Main flow", "### Alternative flows");
  if (!/^\d+\. \*\*Actor:/m.test(mainFlow) || !/System:/m.test(mainFlow)) {
    errors.push("main flow must contain ordered Actor and System behavior");
  }

  const alternatives = section(body, "### Alternative flows", "### Exception flows");
  if (!/Source step:/i.test(alternatives) || !/(Resume at step|Ends with):/i.test(alternatives)) {
    errors.push("alternative flows must identify a source step and resume/end point");
  }

  const exceptions = section(body, "### Exception flows", "### Postconditions");
  if (!/Source step:/i.test(exceptions) || !/Handling:/i.test(exceptions) || !/Prohibited:/i.test(exceptions)) {
    errors.push("exception flows must identify source, handling, and prohibited behavior");
  }
  return errors;
}

function section(body: string, start: string, end: string): string {
  const from = body.indexOf(start);
  const to = body.indexOf(end, from + start.length);
  return from >= 0 ? body.slice(from, to >= 0 ? to : undefined) : "";
}
