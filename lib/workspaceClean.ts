import { sanitizeIntake } from "./briefFile.ts";
import { PLATFORMS, type Draft, type Intake, type PlanItem, type ResultEntry, type Review, type Strategy } from "./types.ts";

/** Everything one project holds. */
export interface Workspace {
  intake: Intake;
  strategy: Strategy | null;
  drafts: Draft[];
  /** Added in v1.1.0. Older saved work does not have these. */
  plan?: PlanItem[];
  results?: ResultEntry[];
  review?: Review | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * Strategies saved by an earlier version could contain the text "[object Object]" where a model
 * had returned objects instead of strings. Drop those lines so old saved work still opens cleanly.
 */
export function cleanStrategy(s: Strategy | null): Strategy | null {
  if (!s) return s;
  const keep = (list: unknown) => strings(list).filter((x) => !x.includes("[object Object]"));
  return { ...s, measurement: keep(s.measurement), risks: keep(s.risks), gaps: keep(s.gaps) };
}

/** Make any saved or imported workspace safe to load: known fields only, right types, no crashes on old data. */
export function cleanWorkspace(raw: unknown): Workspace {
  const w = isObj(raw) ? raw : {};
  const strategy = isObj(w.strategy) && Array.isArray(w.strategy.themes) ? cleanStrategy(w.strategy as unknown as Strategy) : null;
  const drafts = (Array.isArray(w.drafts) ? w.drafts : [])
    .filter((d): d is Record<string, unknown> => isObj(d) && typeof d.id === "string" && typeof d.body === "string" && PLATFORMS.some((p) => p.id === d.platform))
    .map((d) => ({ ...d, hashtags: strings(d.hashtags), claimsUsed: strings(d.claimsUsed), checks: Array.isArray(d.checks) ? d.checks : [] }) as unknown as Draft);
  const plan = (Array.isArray(w.plan) ? w.plan : []).filter(
    (p): p is Record<string, unknown> => isObj(p) && typeof p.id === "string" && typeof p.date === "string" && typeof p.topic === "string" && PLATFORMS.some((x) => x.id === p.platform),
  ) as unknown as PlanItem[];
  const results = (Array.isArray(w.results) ? w.results : []).filter(
    (r): r is Record<string, unknown> => isObj(r) && typeof r.id === "string" && typeof r.date === "string" && typeof r.likes === "number",
  ) as unknown as ResultEntry[];
  const review = isObj(w.review) && typeof w.review.summary === "string" ? ({ ...w.review, doMore: strings(w.review.doMore), tryNext: strings(w.review.tryNext), changeOrStop: strings(w.review.changeOrStop) } as unknown as Review) : null;
  return { intake: sanitizeIntake(isObj(w.intake) ? w.intake : {}), strategy, drafts, plan, results, review };
}
