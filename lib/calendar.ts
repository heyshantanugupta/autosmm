import { addDays } from "./dates.ts";
import { PLATFORM_INFO } from "./postTypes.ts";
import type { Intake, Pillar, Platform, PlanItem, Strategy } from "./types";

/** Post types that suit each kind of post, best fit first. Only types the platform really has are used. */
const PILLAR_TYPES: Record<Pillar, Partial<Record<Platform, string[]>>> = {
  educate: {
    linkedin: ["how-to", "myth-busting", "carousel-outline"],
    instagram: ["carousel", "single-image"],
    x: ["thread", "single-post"],
    facebook: ["community-post", "question-post"],
    youtube: ["tutorial-outline", "short-script"],
    tiktok: ["talking-head"],
    reddit: ["value-post", "discussion-question"],
  },
  story: {
    linkedin: ["founder-story"],
    instagram: ["story-sequence", "reel-script"],
    x: ["build-in-public", "hot-take"],
    facebook: ["short-update"],
    youtube: ["short-script"],
    tiktok: ["pov-skit", "talking-head"],
    reddit: ["discussion-question"],
  },
  proof: {
    linkedin: ["customer-story", "data-insight", "product-demo"],
    instagram: ["single-image", "reel-script"],
    x: ["single-post", "build-in-public"],
    facebook: ["community-post"],
    youtube: ["tutorial-outline"],
    tiktok: ["screen-demo"],
    reddit: ["show-and-tell"],
  },
  offer: {
    linkedin: ["announcement", "product-demo"],
    instagram: ["reel-script", "single-image"],
    x: ["single-post"],
    facebook: ["announcement"],
    youtube: ["short-script"],
    tiktok: ["screen-demo"],
    reddit: ["show-and-tell"],
  },
};

/** The order kinds of post come in. Teaching leads because it earns attention before anyone is asked for anything. */
const PILLAR_CYCLE: Pillar[] = ["educate", "story", "proof", "educate", "offer"];

const FIT_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

export interface ScheduleOptions {
  days?: number;
  /** Posts per week across all platforms. 5 is a pace one person can keep up. */
  perWeek?: number;
  /** Where the offer posts get their topics. */
  maxPlatforms?: number;
}

/** How many posts each platform gets in a week. Stronger fits get more, and everyone chosen gets at least one. */
export function weeklyAllocation(strategy: Strategy, intake: Intake, perWeek: number, maxPlatforms: number): { platform: Platform; count: number }[] {
  const usable = strategy.platforms.filter((p) => PLATFORM_INFO[p.platform]);
  const wanted = usable.filter((p) => intake.channels.length === 0 || intake.channels.includes(p.platform));
  const pool = (wanted.length ? wanted : usable).slice().sort((a, b) => FIT_WEIGHT[b.fit] - FIT_WEIGHT[a.fit]);
  const chosen = (pool.filter((p) => p.fit !== "low").length ? pool.filter((p) => p.fit !== "low") : pool).slice(0, maxPlatforms);
  if (chosen.length === 0) return [];
  const total = Math.max(perWeek, chosen.length);
  const weight = chosen.reduce((sum, p) => sum + FIT_WEIGHT[p.fit], 0);
  const out = chosen.map((p) => ({ platform: p.platform, count: Math.max(1, Math.floor((total * FIT_WEIGHT[p.fit]) / weight)) }));
  let left = total - out.reduce((n, o) => n + o.count, 0);
  for (let i = 0; left > 0; i = (i + 1) % out.length, left--) out[i].count++;
  for (let i = out.length - 1; left < 0 && i >= 0; i--) if (out[i].count > 1) { out[i].count--; left++; }
  return out;
}

/** Interleave platforms so the same one does not post two days in a row when it can be avoided. */
function weekSlots(alloc: { platform: Platform; count: number }[]): Platform[] {
  const left = alloc.map((a) => ({ ...a }));
  const slots: Platform[] = [];
  while (left.some((l) => l.count > 0)) {
    left.sort((a, b) => b.count - a.count);
    const pick = left.find((l) => l.count > 0 && l.platform !== slots[slots.length - 1]) ?? left.find((l) => l.count > 0)!;
    pick.count--;
    slots.push(pick.platform);
  }
  return slots;
}

function pickPostType(platform: Platform, pillar: Pillar, hasProof: boolean, used: Map<string, number>): string {
  const info = PLATFORM_INFO[platform];
  const ok = (id: string) => {
    const t = info.postTypes.find((x) => x.id === id);
    return Boolean(t) && (hasProof || !t!.needsRealProof);
  };
  let candidates = (PILLAR_TYPES[pillar][platform] ?? []).filter(ok);
  if (candidates.length === 0) candidates = info.postTypes.filter((t) => hasProof || !t.needsRealProof).map((t) => t.id);
  const count = (id: string) => used.get(`${platform}:${id}`) ?? 0;
  const best = candidates.reduce((a, b) => (count(b) < count(a) ? b : a), candidates[0]);
  used.set(`${platform}:${best}`, count(best) + 1);
  return best;
}

const lines = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * Turn a strategy into dated posts. No model is involved, so the plan is the same every time and
 * always balanced: every theme and every kind of post gets its turn.
 */
export function buildSchedule(strategy: Strategy, intake: Intake, startISO: string, opts: ScheduleOptions = {}): PlanItem[] {
  const days = opts.days ?? 30;
  const perWeek = Math.min(14, Math.max(1, opts.perWeek ?? 5));
  const alloc = weeklyAllocation(strategy, intake, perWeek, opts.maxPlatforms ?? 3);
  if (alloc.length === 0 || strategy.themes.length === 0) return [];

  const slots = weekSlots(alloc);
  const n = slots.length;
  const hasProof = intake.proof.trim().length > 0;
  const updates = lines(intake.newUpdates);
  const used = new Map<string, number>();
  const items: PlanItem[] = [];
  let i = 0;
  let offers = 0;

  for (let week = 0; week * 7 < days; week++) {
    for (let s = 0; s < n; s++) {
      const offset = week * 7 + Math.floor((s * 7) / n);
      if (offset >= days) continue;
      const platform = slots[s];
      const pillar = PILLAR_CYCLE[i % PILLAR_CYCLE.length];
      const theme = strategy.themes[i % strategy.themes.length];
      const topic =
        pillar === "offer"
          ? updates[offers++ % Math.max(updates.length, 1)] ?? `Show one thing ${intake.productName || "it"} does, and how to try it`
          : i < strategy.themes.length
            ? theme.exampleAngle || theme.name
            : `${theme.name}: ${pillar === "educate" ? "a tip people can use today" : pillar === "story" ? "a real moment behind it" : "how it works, with something real to show"}`;
      const date = addDays(startISO, offset);
      items.push({
        id: `${date}-${platform}-${i}`,
        date,
        platform,
        postTypeId: pickPostType(platform, pillar, hasProof, used),
        themeId: theme.id,
        pillar,
        topic,
      });
      i++;
    }
  }
  return items.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

export function planToCsv(items: PlanItem[], themeName: (id: string) => string): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = items.map((it) =>
    [it.date, PLATFORM_INFO[it.platform].label, PLATFORM_INFO[it.platform].postTypes.find((t) => t.id === it.postTypeId)?.label ?? it.postTypeId, themeName(it.themeId), it.pillar, it.topic, it.posted ? "posted" : it.draftId ? "written" : "to write"].map(q).join(","),
  );
  return ["Date,Platform,Post type,Theme,Kind,Topic,Status", ...rows].join("\n");
}
