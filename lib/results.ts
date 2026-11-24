import type { Platform, ResultEntry } from "./types";
import { PLATFORM_INFO, getPostType } from "./postTypes.ts";

export const engagement = (e: ResultEntry) => e.likes + e.comments;

export interface Group {
  key: string;
  label: string;
  count: number;
  avgEngagement: number;
  avgViews: number;
}

function group(entries: ResultEntry[], key: (e: ResultEntry) => string | undefined, label: (k: string) => string): Group[] {
  const map = new Map<string, ResultEntry[]>();
  for (const e of entries) {
    const k = key(e);
    if (k) map.set(k, [...(map.get(k) ?? []), e]);
  }
  return [...map.entries()]
    .map(([k, list]) => ({
      key: k,
      label: label(k),
      count: list.length,
      avgEngagement: Math.round((list.reduce((n, e) => n + engagement(e), 0) / list.length) * 10) / 10,
      avgViews: Math.round(list.reduce((n, e) => n + e.views, 0) / list.length),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement || b.count - a.count);
}

export interface Summary {
  total: number;
  byPlatform: Group[];
  byTheme: Group[];
  byType: Group[];
  best: ResultEntry | null;
  worst: ResultEntry | null;
  /** Under 5 posts is too few to call anything a winner. */
  enough: boolean;
}

export function summarize(entries: ResultEntry[], themeName: (id: string) => string): Summary {
  const ranked = entries.slice().sort((a, b) => engagement(b) - engagement(a));
  return {
    total: entries.length,
    byPlatform: group(entries, (e) => e.platform, (k) => PLATFORM_INFO[k as Platform]?.label ?? k),
    byTheme: group(entries, (e) => e.themeId, (k) => themeName(k) || k),
    byType: group(entries, (e) => (e.postTypeId ? `${e.platform}:${e.postTypeId}` : undefined), (k) => {
      const [p, t] = k.split(":");
      return `${PLATFORM_INFO[p as Platform]?.label ?? p} ${getPostType(p as Platform, t)?.label ?? t}`;
    }),
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    enough: entries.length >= 5,
  };
}

/** A plain-words table of the numbers, used both on screen and as the only data the review may cite. */
export function summaryText(s: Summary): string {
  const rows = (title: string, g: Group[]) =>
    g.length ? `${title}:\n${g.map((x) => `- ${x.label}: ${x.count} post${x.count === 1 ? "" : "s"}, ${x.avgEngagement} likes and comments on average, ${x.avgViews} views on average`).join("\n")}` : "";
  return [`Posts logged: ${s.total}`, rows("By platform", s.byPlatform), rows("By theme", s.byTheme), rows("By post type", s.byType),
    s.best ? `Best post: "${s.best.label}" (${engagement(s.best)} likes and comments, ${s.best.views} views)` : "",
    s.worst ? `Weakest post: "${s.worst.label}" (${engagement(s.worst)} likes and comments, ${s.worst.views} views)` : ""]
    .filter(Boolean)
    .join("\n\n");
}

/** A review that needs no model: it reads the table and says what it shows. */
export function basicReview(s: Summary): { summary: string; doMore: string[]; changeOrStop: string[]; tryNext: string[] } {
  if (s.total === 0) return { summary: "No results logged yet. Add the numbers for a few posts and the review will have something to work with.", doMore: [], changeOrStop: [], tryNext: [] };
  const caution = s.enough ? "" : ` With only ${s.total} post${s.total === 1 ? "" : "s"} logged, treat this as a first hint, not a result. Log at least 5 to see a real pattern.`;
  const top = s.byTheme[0];
  const bottom = s.byTheme.length > 1 ? s.byTheme[s.byTheme.length - 1] : null;
  const topP = s.byPlatform[0];
  const doMore: string[] = [];
  if (top) doMore.push(`Write more about "${top.label}". It averaged ${top.avgEngagement} likes and comments per post.`);
  if (topP && s.byPlatform.length > 1) doMore.push(`Put a little more effort into ${topP.label}, your strongest platform so far.`);
  if (s.best) doMore.push(`Reuse what worked in "${s.best.label}": the same topic with a new hook.`);
  const changeOrStop: string[] = [];
  if (bottom && top && bottom.key !== top.key) changeOrStop.push(`"${bottom.label}" is getting the least response (${bottom.avgEngagement} on average). Try a different angle before you drop it.`);
  if (s.worst && s.total > 2) changeOrStop.push(`Rework the idea behind "${s.worst.label}", which got the least response.`);
  return {
    summary: `You logged ${s.total} post${s.total === 1 ? "" : "s"}. ${top ? `"${top.label}" is doing best so far.` : ""}${caution}`.trim(),
    doMore,
    changeOrStop,
    tryNext: ["Try the opening line of your best post on a new topic.", "Ask a question at the end of one post and see if comments go up."],
  };
}
