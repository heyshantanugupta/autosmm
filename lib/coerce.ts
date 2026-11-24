/**
 * Models, especially smaller free ones, do not always follow the output schema exactly.
 * A list of strings can come back as a list of small objects. These helpers turn whatever
 * arrives into plain text instead of showing "[object Object]".
 */
const TEXT_KEYS = ["text", "description", "risk", "gap", "metric", "measure", "claim", "fact", "quote", "detail", "name", "title", "item", "summary", "value"];

export function toText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join("; ");
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    // Prefer a title plus its explanation, e.g. {risk: "...", why: "..."}.
    const main = TEXT_KEYS.map((k) => (typeof o[k] === "string" ? (o[k] as string).trim() : "")).find(Boolean);
    if (main) {
      const extra = Object.entries(o)
        .filter(([, val]) => typeof val === "string" && val.trim() && val.trim() !== main)
        .map(([, val]) => (val as string).trim());
      return [main, ...extra].join(": ");
    }
    return Object.values(o).map(toText).filter(Boolean).join(": ");
  }
  return "";
}

export function toTextList(v: unknown): string[] {
  const items = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  return items.map(toText).filter((s) => s.length > 0);
}
