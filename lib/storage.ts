import { DEFAULT_PROVIDER, getProvider, type ProviderId } from "./providers";
import type { Draft, Intake, PlanItem, ResultEntry, Review, Strategy } from "./types";
import { BLANK_INTAKE } from "./presets";

export interface Settings {
  provider: ProviderId;
  apiKey: string;
  /** Keep the key in this browser across sessions. Off by default: the key lives for the tab only. */
  remember: boolean;
  model: string;
  /** Demo mode skips the API and returns template output. */
  demo: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: DEFAULT_PROVIDER,
  apiKey: "",
  remember: false,
  model: getProvider(DEFAULT_PROVIDER).defaultModel,
  demo: false,
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
  };
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  const prefs: Partial<Settings> = { provider: s.provider, remember: s.remember, model: s.model, demo: s.demo };
  if (s.remember) {
    prefs.apiKey = s.apiKey;
    remove(window.sessionStorage, SESSION_KEY);
  } else {
    write(window.sessionStorage, SESSION_KEY, s.apiKey);
  }
  write(window.localStorage, PREFS_KEY, JSON.stringify(prefs));
}

export interface Workspace {
  intake: Intake;
  strategy: Strategy | null;
  drafts: Draft[];
  /** Added in v1.1.0. Older saved work does not have these. */
  plan?: PlanItem[];
  results?: ResultEntry[];
  review?: Review | null;
}

/**
 * Strategies saved by an earlier version could contain the text "[object Object]" where a model
 * had returned objects instead of strings. Drop those lines so old saved work still opens cleanly.
 */
function cleanStrategy(s: Strategy | null): Strategy | null {
  if (!s) return s;
  const keep = (list: unknown) =>
    Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && !x.includes("[object Object]")) : [];
  return { ...s, measurement: keep(s.measurement), risks: keep(s.risks), gaps: keep(s.gaps) };
}

export function loadWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  const raw = read(window.localStorage, WORKSPACE_KEY);
  if (!raw) return null;
  try {
    const w = JSON.parse(raw) as Workspace;
    // Work saved by an older version may lack newer fields, so start from a blank brief and overlay it.
    return { ...w, intake: { ...BLANK_INTAKE, ...(w.intake ?? {}) }, strategy: cleanStrategy(w.strategy ?? null) };
  } catch {
    return null;
  }
}

export function saveWorkspace(w: Workspace) {
  if (typeof window === "undefined") return;
  write(window.localStorage, WORKSPACE_KEY, JSON.stringify(w));
}

export function clearAllStoredData() {
  if (typeof window === "undefined") return;
  remove(window.localStorage, WORKSPACE_KEY);
  remove(window.localStorage, PREFS_KEY);
  remove(window.sessionStorage, SESSION_KEY);
}
