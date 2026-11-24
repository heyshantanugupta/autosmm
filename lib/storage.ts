import { removeLogo } from "./logo";
import { DEFAULT_PROVIDER, getProvider, type ProviderId } from "./providers";
import { cleanIndex, FIRST_NAME, makeMeta, type ProjectIndex } from "./projects";
import { cleanWorkspace, type Workspace } from "./workspaceClean";

export interface Settings {
  provider: ProviderId;
  apiKey: string;
  /** Keep the key in this browser across sessions. Off by default: the key lives for the tab only. */
  remember: boolean;
  model: string;
  /** Demo mode skips the API and returns template output. */
  demo: boolean;
  /** Text and layout scale in percent, 80 to 120. */
  uiScale: number;
}

export const UI_SCALES = [80, 90, 100, 110, 120];

export const DEFAULT_SETTINGS: Settings = {
  provider: DEFAULT_PROVIDER,
  apiKey: "",
  remember: false,
  model: getProvider(DEFAULT_PROVIDER).defaultModel,
  demo: false,
  uiScale: 90,
};

const PREFS_KEY = "ssa.prefs";
const SESSION_KEY = "ssa.session-key";
const WORKSPACE_KEY = "ssa.workspace";

function read(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(store: Storage | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    /* storage can be blocked or full; the app still works without it */
  }
}
function remove(store: Storage | undefined, key: string) {
  try {
    store?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const prefsRaw = read(window.localStorage, PREFS_KEY);
  let prefs: Partial<Settings> = {};
  try {
    prefs = prefsRaw ? (JSON.parse(prefsRaw) as Partial<Settings>) : {};
  } catch {
    prefs = {};
  }
  const sessionKey = read(window.sessionStorage, SESSION_KEY);
  const provider = getProvider(prefs.provider ?? DEFAULT_PROVIDER);
  return {
    provider: provider.id,
    apiKey: prefs.remember ? (prefs.apiKey ?? "") : (sessionKey ?? ""),
    remember: Boolean(prefs.remember),
    model: prefs.model ?? provider.defaultModel,
    demo: Boolean(prefs.demo),
    uiScale: UI_SCALES.includes(Number(prefs.uiScale)) ? Number(prefs.uiScale) : DEFAULT_SETTINGS.uiScale,
  };
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  const prefs: Partial<Settings> = { provider: s.provider, remember: s.remember, model: s.model, demo: s.demo, uiScale: s.uiScale };
  if (s.remember) {
    prefs.apiKey = s.apiKey;
    remove(window.sessionStorage, SESSION_KEY);
  } else {
    write(window.sessionStorage, SESSION_KEY, s.apiKey);
  }
  write(window.localStorage, PREFS_KEY, JSON.stringify(prefs));
}

export type { Workspace } from "./workspaceClean";

const INDEX_KEY = "ssa.projects";
const projectKey = (id: string) => `ssa.project.${id}`;

export function loadProject(id: string): Workspace | null {
  if (typeof window === "undefined") return null;
  const raw = read(window.localStorage, projectKey(id));
  if (!raw) return null;
  try {
    return cleanWorkspace(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveProject(id: string, w: Workspace) {
  if (typeof window === "undefined") return;
  write(window.localStorage, projectKey(id), JSON.stringify(w));
}

export function deleteProjectData(id: string) {
  if (typeof window === "undefined") return;
  remove(window.localStorage, projectKey(id));
  removeLogo(id);
}

export function saveIndex(index: ProjectIndex) {
  if (typeof window === "undefined") return;
  write(window.localStorage, INDEX_KEY, JSON.stringify(index));
}

/**
 * Load the project list and the active project. Work saved by v1.1.x and earlier lived in a single
 * slot: it becomes the first project, so nothing is lost on update.
 */
export function loadProjects(): { index: ProjectIndex; workspace: Workspace } {
  const blank = (): Workspace => cleanWorkspace({});
  if (typeof window === "undefined") {
    const meta = makeMeta(FIRST_NAME, true);
    return { index: { activeId: meta.id, projects: [meta] }, workspace: blank() };
  }
  let index: ProjectIndex | null = null;
  try {
    const raw = read(window.localStorage, INDEX_KEY);
    index = raw ? cleanIndex(JSON.parse(raw)) : null;
  } catch {
    index = null;
  }
  if (index) return { index, workspace: loadProject(index.activeId) ?? blank() };

  let workspace = blank();
  const legacyRaw = read(window.localStorage, WORKSPACE_KEY);
  if (legacyRaw) {
    try {
      workspace = cleanWorkspace(JSON.parse(legacyRaw));
    } catch {
      /* unreadable old save: start empty */
    }
  }
  const meta = makeMeta(workspace.intake.productName || FIRST_NAME, true);
  index = { activeId: meta.id, projects: [meta] };
  saveIndex(index);
  saveProject(meta.id, workspace);
  remove(window.localStorage, WORKSPACE_KEY);
  return { index, workspace };
}

export function clearAllStoredData() {
  if (typeof window === "undefined") return;
  try {
    const raw = read(window.localStorage, INDEX_KEY);
    const index = raw ? cleanIndex(JSON.parse(raw)) : null;
    for (const p of index?.projects ?? []) {
      remove(window.localStorage, projectKey(p.id));
      removeLogo(p.id);
    }
  } catch {
    /* ignore */
  }
  remove(window.localStorage, INDEX_KEY);
  remove(window.localStorage, WORKSPACE_KEY);
  remove(window.localStorage, PREFS_KEY);
  remove(window.sessionStorage, SESSION_KEY);
}
