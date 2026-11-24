/** A project is one product's brief, strategy, plan, drafts and results. Like a save slot. */
export interface ProjectMeta {
  id: string;
  name: string;
  /** True until the user renames it: the name then follows the product name in the brief. */
  auto: boolean;
}

export interface ProjectIndex {
  activeId: string;
  projects: ProjectMeta[];
}

export const FIRST_NAME = "My first project";
export const NEW_NAME = "New project";
export const MAX_NAME = 60;

export function newId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

/** "Name", then "Name 2", "Name 3" if the name is taken (case-insensitive). */
export function uniqueName(name: string, taken: string[]): string {
  const base = cleanName(name) || NEW_NAME;
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const next = `${base.slice(0, MAX_NAME - 4)} ${n}`;
    if (!used.has(next.toLowerCase())) return next;
  }
}

export function makeMeta(name: string, auto: boolean, index?: ProjectIndex): ProjectMeta {
  return { id: newId(), name: uniqueName(name, index?.projects.map((p) => p.name) ?? []), auto };
}

export function addProject(index: ProjectIndex, meta: ProjectMeta): ProjectIndex {
  return { activeId: meta.id, projects: [...index.projects, meta] };
}

export function renameProject(index: ProjectIndex, id: string, name: string): ProjectIndex {
  const clean = cleanName(name);
  if (!clean) return index;
  const others = index.projects.filter((p) => p.id !== id).map((p) => p.name);
  const next = uniqueName(clean, others);
  return { ...index, projects: index.projects.map((p) => (p.id === id ? { ...p, name: next, auto: false } : p)) };
}

/** While a project has not been renamed, its name follows the product name. Returns the same object when nothing changes. */
export function syncAutoName(index: ProjectIndex, id: string, productName: string): ProjectIndex {
  const meta = index.projects.find((p) => p.id === id);
  const wanted = cleanName(productName);
  if (!meta || !meta.auto || !wanted || meta.name === wanted) return index;
  const others = index.projects.filter((p) => p.id !== id).map((p) => p.name);
  const next = uniqueName(wanted, others);
  if (next === meta.name) return index;
  return { ...index, projects: index.projects.map((p) => (p.id === id ? { ...p, name: next } : p)) };
}

/** Remove one project. The active one moves to a neighbour. Returns an empty list when the last one goes. */
export function removeProject(index: ProjectIndex, id: string): ProjectIndex {
  const i = index.projects.findIndex((p) => p.id === id);
  if (i < 0) return index;
  const projects = index.projects.filter((p) => p.id !== id);
  const activeId = index.activeId !== id ? index.activeId : (projects[Math.min(i, projects.length - 1)]?.id ?? "");
  return { activeId, projects };
}

/** Make a saved index safe to use: valid entries only, and an active project that exists. */
export function cleanIndex(raw: unknown): ProjectIndex | null {
  const r = raw as { activeId?: unknown; projects?: unknown } | null;
  if (!r || !Array.isArray(r.projects)) return null;
  const seen = new Set<string>();
  const projects: ProjectMeta[] = [];
  for (const p of r.projects) {
    const o = p as Partial<ProjectMeta> | null;
    if (!o || typeof o.id !== "string" || !/^[\w-]{1,40}$/.test(o.id) || seen.has(o.id)) continue;
    seen.add(o.id);
    projects.push({ id: o.id, name: cleanName(typeof o.name === "string" ? o.name : "") || NEW_NAME, auto: o.auto === true });
  }
  if (projects.length === 0) return null;
  const activeId = typeof r.activeId === "string" && seen.has(r.activeId) ? r.activeId : projects[0].id;
  return { activeId, projects };
}
