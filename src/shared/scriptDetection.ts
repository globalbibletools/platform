export type Script = "hebrew" | "greek";

// Simple heuristic: Hebrew block vs Greek block
export function detectScript(text: string): Script {
  const hebrewRegex = /[\u0590-\u05FF]/;
  const greekRegex = /[\u0370-\u03FF]/;
  if (hebrewRegex.test(text)) return "hebrew";
  if (greekRegex.test(text)) return "greek";
  // Default to Hebrew if ambiguous; adjust as needed
  return "hebrew";
}
