import { cleanName } from "./projects.ts";
import { cleanWorkspace, type Workspace } from "./workspaceClean.ts";

const APP = "autosmm";
export const MAX_PROJECT_FILE_BYTES = 8_000_000;

/** A project as a file you can back up or move to another computer. It never holds an API key. */
export function serializeProject(name: string, workspace: Workspace): string {
  return JSON.stringify({ app: APP, kind: "project", version: 1, name, workspace }, null, 2);
}

export function projectFileName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${slug || "my"}-project.json`;
}

export type ProjectFileResult = { ok: true; name: string; workspace: Workspace } | { ok: false; error: string };

export function parseProjectFile(text: string): ProjectFileResult {
  const bad = { ok: false as const, error: "That file is not a saved project. Pick a project file exported from AutoSMM." };
  if (text.length > MAX_PROJECT_FILE_BYTES) return { ok: false, error: "That file is too large to be a project." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return bad;
  }
  const root = data as { app?: unknown; kind?: unknown; name?: unknown; workspace?: unknown } | null;
  if (!root || typeof root !== "object" || root.app !== APP || root.kind !== "project" || !root.workspace || typeof root.workspace !== "object") return bad;
  const workspace = cleanWorkspace(root.workspace);
  const name = cleanName(typeof root.name === "string" ? root.name : "") || workspace.intake.productName || "Imported project";
  return { ok: true, name, workspace };
}
