import { GOALS, PLATFORMS, type Intake } from "./types.ts";

const APP = "social-strategy-agent";
export const MAX_BRIEF_FILE_BYTES = 200_000;

const TEXT_FIELDS = ["productName", "oneLiner", "website", "audience", "facts", "proof", "newUpdates", "doNotSay", "tone", "currentState"] as const;

/** The brief as a small JSON file. It holds only the brief: never an API key or any drafts. */
export function serializeBrief(intake: Intake): string {
  return JSON.stringify({ app: APP, version: 1, brief: intake }, null, 2);
}

export function briefFileName(intake: Intake): string {
  const slug = intake.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${slug || "my"}-brief.json`;
}

export type BriefResult = { ok: true; intake: Intake } | { ok: false; error: string };

export function parseBriefFile(text: string): BriefResult {
  if (text.length > MAX_BRIEF_FILE_BYTES) return { ok: false, error: "That file is too large to be a brief." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not a saved brief. Pick a .json file saved from this app." };
  }
  const root = data as { app?: unknown; brief?: unknown };
  if (!root || typeof root !== "object" || root.app !== APP || !root.brief || typeof root.brief !== "object") {
    return { ok: false, error: "That file is not a saved brief. Pick a .json file saved from this app." };
  }
  const b = root.brief as Record<string, unknown>;
  const intake = {} as Record<string, unknown>;
  for (const key of TEXT_FIELDS) {
    const v = b[key];
    intake[key] = typeof v === "string" ? v : "";
  }
  intake.goal = GOALS.find((g) => g.id === b.goal)?.id ?? "awareness";
  intake.channels = (Array.isArray(b.channels) ? b.channels : []).filter((c) => PLATFORMS.some((p) => p.id === c));
  return { ok: true, intake: intake as unknown as Intake };
}
